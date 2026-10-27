/* Reine Logik des Checkout-Trainers (läuft im Browser und in Node). */
(function (root) {
  function dartValue(d) { return ({ S: 1, D: 2, T: 3 })[d.m] * d.n; }
  function label(d) {
    if (d.n === 25) return d.m === 'D' ? 'Bull' : '25';
    return d.m + d.n;
  }
  function parseToken(t) {
    if (t === 'Bull') return { m: 'D', n: 25 };
    return { m: t[0], n: parseInt(t.slice(1), 10) };
  }
  function parseRoutes(txt) {
    var out = {};
    txt.trim().split('\n').forEach(function (l) {
      var p = l.trim().split(/\s+/);
      out[+p[0]] = p.slice(1).map(parseToken);
    });
    return out;
  }
  function routeText(r) { return r.map(label).join(' '); }
  function sum(darts) { return darts.reduce(function (a, d) { return a + dartValue(d); }, 0); }
  function isValidDart(d) {
    if (d.n === 25) return d.m !== 'T';
    return d.n >= 1 && d.n <= 20;
  }
  /* Bewertet eine eingegebene Dartfolge. */
  function evaluate(score, darts) {
    var s = sum(darts);
    var last = darts[darts.length - 1];
    var lastDouble = !!last && last.m === 'D';
    return { ok: darts.length > 0 && darts.length <= 3 && s === score && lastDouble, sum: s, lastDouble: lastDouble };
  }
  function pool(routesObj, lo, hi) {
    var a = [];
    for (var i = Math.max(2, lo); i <= Math.min(170, hi); i++) a.push(i);
    return a;
  }
  var WEIGHTS = [6, 8, 5, 3, 2, 1]; /* Index = Box, 0 = noch nie gesehen */
  function pick(poolArr, boxes, lastScore, rnd) {
    var cand = poolArr.filter(function (s) { return s !== lastScore; });
    if (!cand.length) cand = poolArr.slice();
    var w = cand.map(function (s) { return WEIGHTS[boxes[s] || 0]; });
    var total = w.reduce(function (a, b) { return a + b; }, 0);
    var r = rnd() * total;
    for (var i = 0; i < cand.length; i++) { r -= w[i]; if (r < 0) return cand[i]; }
    return cand[cand.length - 1];
  }
  /* Neue Box nach einer Antwort. Mit Tipp gibt es keine Beförderung. */
  function nextBox(box, correct, hinted) {
    box = box || 0;
    if (!correct) return 1;
    if (hinted) return Math.max(box, 1);
    return Math.min(5, Math.max(box, 1) + 1);
  }
  /* ---------- Antwort-Log ----------
     Gespeichert wird nur das Log. Boxen, Tageszähler und Serie werden daraus abgeleitet.
     Eintrag: { t, score, richtig, tipp, darts: ['T20','D20'], nc? }  (nc = "Nicht checkbar" gedrückt)
     Reset-Marker: { t, reset: true }  (Boxen starten danach neu, Log und Serie bleiben) */
  function dartToken(d) { return d.m + d.n; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* Kalendertag in lokaler Zeit, z. B. "2026-10-27". */
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function makeEntry(t, score, richtig, tipp, darts, nc) {
    var e = { t: t, score: score, richtig: !!richtig, tipp: !!tipp, darts: darts.map(dartToken) };
    if (nc) e.nc = true;
    return e;
  }
  function deriveBoxes(log) {
    var b = {};
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      if (e.reset) { b = {}; continue; }
      b[e.score] = nextBox(b[e.score], e.richtig, e.tipp);
    }
    return b;
  }
  /* Heute: Antworten des aktuellen Kalendertags. Serie: richtige Antworten am Stück, tagesübergreifend. */
  function stats(log, now) {
    var today = dayKey(now), n = 0, ok = 0, streak = 0, broken = false;
    for (var i = log.length - 1; i >= 0; i--) {
      var e = log[i];
      if (e.reset) continue;
      if (dayKey(e.t) === today) { n++; if (e.richtig) ok++; }
      if (!broken) { if (e.richtig) streak++; else broken = true; }
    }
    return { n: n, ok: ok, streak: streak };
  }
  var TOKEN = /^(S([1-9]|1\d|20|25)|D([1-9]|1\d|20|25)|T([1-9]|1\d|20))$/;
  function validEntry(e) {
    if (!e || typeof e.t !== 'number' || !isFinite(e.t)) return false;
    if (e.reset === true) return true;
    return typeof e.score === 'number' && e.score >= 2 && e.score <= 170 &&
      typeof e.richtig === 'boolean' && typeof e.tipp === 'boolean' &&
      Array.isArray(e.darts) && e.darts.length <= 3 &&
      e.darts.every(function (d) { return typeof d === 'string' && TOKEN.test(d); });
  }
  function entryKey(e) { return e.t + '|' + (e.reset ? 'r' : e.score); }
  /* Zwei Logs vereinigen (z. B. Import einer Sicherung): Duplikate fallen weg, Ergebnis ist zeitlich sortiert. */
  function mergeLogs(a, b) {
    var seen = {}, out = [];
    a.concat(b).forEach(function (e) { var k = entryKey(e); if (!seen[k]) { seen[k] = 1; out.push(e); } });
    return out.sort(function (x, y) { return x.t - y.t; });
  }
  /* Prüft eine Sicherungsdatei. Liefert { log } oder { error }. */
  function parseBackup(txt) {
    var o;
    try { o = JSON.parse(txt); } catch (e) { return { error: 'Die Datei ist kein gültiges JSON.' }; }
    if (!o || o.app !== 'checkout-trainer' || !Array.isArray(o.log)) return { error: 'Das ist keine Sicherung des Checkout-Trainers.' };
    if (o.v !== 2) return { error: 'Unbekannte Version der Sicherung' + (typeof o.v === 'number' ? ' (' + o.v + ')' : '') + '.' };
    var bad = o.log.filter(function (e) { return !validEntry(e); }).length;
    if (bad) return { error: bad + ' Einträge in der Sicherung sind beschädigt. Nichts importiert.' };
    return { log: o.log };
  }
  /* Liest den gespeicherten Stand. problem ist gesetzt, wenn etwas nicht lesbar war –
     dann darf der Rohtext nicht kommentarlos überschrieben werden. */
  function parseStored(raw) {
    var empty = { log: [], range: null, lastBackup: 0, snoozeUntil: 0, problem: null };
    if (raw == null) return empty;
    var o;
    try { o = JSON.parse(raw); } catch (e) { empty.problem = 'unlesbar'; return empty; }
    if (!o || typeof o !== 'object' || !Array.isArray(o.log)) { empty.problem = 'unlesbar'; return empty; }
    var log = o.log.filter(validEntry), dropped = o.log.length - log.length;
    var num = function (x) { return typeof x === 'number' && isFinite(x) ? x : 0; };
    return { log: log, range: o.range == null ? null : o.range, lastBackup: num(o.lastBackup), snoozeUntil: num(o.snoozeUntil),
      problem: dropped ? dropped + ' Einträge unlesbar' : null };
  }

  /* ---------- Erinnerung an die Datei-Sicherung ----------
     Fällig, wenn seit der letzten Sicherung BACKUP_DAYS Tage vergangen sind (oder nie gesichert wurde)
     UND seitdem mindestens BACKUP_MIN neue Antworten dazukamen. So nervt sie nicht nach einer Trainingspause. */
  var BACKUP_DAYS = 14, BACKUP_MIN = 50, DAY = 864e5;
  function backupStatus(log, lastBackup, snoozeUntil, now) {
    var fresh = 0;
    for (var i = log.length - 1; i >= 0 && log[i].t > lastBackup; i--) if (!log[i].reset) fresh++;
    var days = lastBackup ? Math.floor((now - lastBackup) / DAY) : null;
    var due = fresh >= BACKUP_MIN && (days === null || days >= BACKUP_DAYS) && now >= snoozeUntil;
    return { due: due, days: days, fresh: fresh };
  }
  /* Ende des lokalen Kalendertags von t: "Später" blendet die Erinnerung bis morgen aus. */
  function endOfDay(t) { var d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime(); }

  /* ---------- Problemzahlen ----------
     Zahlen aus der Liste scores mit den meisten Fehlern im Zeitraum (Standard 30 Tage).
     Sortierung: Fehler absteigend, dann Fehlerquote, dann Zahl absteigend. */
  function problemNumbers(log, scores, now, days, limit) {
    days = days || 30; limit = limit || 5;
    var from = now - days * DAY, inSet = {}, agg = {}, total = 0;
    scores.forEach(function (s) { inSet[s] = 1; });
    log.forEach(function (e) {
      if (e.reset || e.t < from || !inSet[e.score]) return;
      total++;
      var a = agg[e.score] || (agg[e.score] = { score: e.score, n: 0, wrong: 0 });
      a.n++; if (!e.richtig) a.wrong++;
    });
    var list = Object.keys(agg).map(function (k) { return agg[k]; }).filter(function (a) { return a.wrong > 0; });
    list.sort(function (x, y) { return y.wrong - x.wrong || y.wrong / y.n - x.wrong / x.n || y.score - x.score; });
    return { total: total, list: list.slice(0, limit) };
  }
  /* Für Texte, die per innerHTML eingesetzt werden. */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var api = { dartValue: dartValue, label: label, parseRoutes: parseRoutes, routeText: routeText, sum: sum,
    isValidDart: isValidDart, evaluate: evaluate, pool: pool, pick: pick, nextBox: nextBox, WEIGHTS: WEIGHTS,
    dayKey: dayKey, makeEntry: makeEntry, deriveBoxes: deriveBoxes, stats: stats, validEntry: validEntry,
    mergeLogs: mergeLogs, parseBackup: parseBackup, parseStored: parseStored, esc: esc,
    backupStatus: backupStatus, endOfDay: endOfDay, problemNumbers: problemNumbers, BACKUP_DAYS: BACKUP_DAYS, BACKUP_MIN: BACKUP_MIN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CO = api;
})(typeof window !== 'undefined' ? window : globalThis);

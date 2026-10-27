(function () {
  var ROUTES = CO.parseRoutes(window.ROUTES_TXT);
  /* [von, bis, Beschriftung, feste Kennung]. Gespeichert wird die Kennung, damit neue Bereiche die Auswahl nicht verschieben. */
  var RANGES = [[2, 40, '2–40', '2-40'], [41, 80, '41–80', '41-80'], [81, 120, '81–120', '81-120'], [121, 170, '121–170', '121-170'], [2, 170, 'Alles', 'alles']];
  /* Eigener Schlüssel, weil sich alle Apps unter kornmischa-cmyk.github.io denselben localStorage teilen. */
  var KEY = 'checkout-trainer-v2';
  var BOXCOL = ['var(--b0)', 'var(--b1)', 'var(--b2)', 'var(--b3)', 'var(--b4)', 'var(--b5)'];
  var st = { tab: 'train', range: 1, log: [], boxes: {}, cur: null, last: null, confirmReset: false, mult: 'S',
    saveFailed: false, persisted: null, msg: null, damaged: null, lastBackup: 0, snoozeUntil: 0 };

  function rangeIndex(v) {
    for (var i = 0; i < RANGES.length; i++) if (RANGES[i][3] === v) return i;
    return null; /* unbekannt (z. B. früherer Bereich 41-60): Standard 41–80 */
  }
  function readStored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function load() {
    var raw = readStored(), r = CO.parseStored(raw);
    if (r.problem) {
      /* Nicht kommentarlos überschreiben: Rohtext beiseitelegen und Hinweis zeigen. */
      st.damaged = { raw: raw, problem: r.problem };
      try { localStorage.setItem(KEY + '-defekt', raw); } catch (e) {}
    }
    st.log = r.log;
    var ri = rangeIndex(r.range); if (ri !== null) st.range = ri;
    st.lastBackup = r.lastBackup; st.snoozeUntil = r.snoozeUntil;
    st.boxes = CO.deriveBoxes(st.log);
  }
  /* Vor dem Schreiben den gespeicherten Stand einmischen: Ein zweites offenes Fenster
     (z. B. installierte App und Browser-Tab) hat evtl. inzwischen eigene Antworten gespeichert. */
  function syncFromStorage(raw) {
    var r = CO.parseStored(raw);
    if (r.problem) return false;
    var changed = false;
    if (r.lastBackup > st.lastBackup) { st.lastBackup = r.lastBackup; changed = true; }
    if (r.snoozeUntil > st.snoozeUntil) { st.snoozeUntil = r.snoozeUntil; changed = true; }
    var before = st.log.length;
    if (r.log.length) st.log = CO.mergeLogs(st.log, r.log);
    if (st.log.length !== before) { st.boxes = CO.deriveBoxes(st.log); changed = true; }
    return changed;
  }
  function save() {
    syncFromStorage(readStored());
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, range: RANGES[st.range][3], lastBackup: st.lastBackup, snoozeUntil: st.snoozeUntil, log: st.log })); st.saveFailed = false; }
    catch (e) { st.saveFailed = true; }
  }
  /* Kurzmeldung für Screenreader in einer dauerhaft vorhandenen Live-Region. */
  function announce(text) {
    var live = $('live'); if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 50);
  }
  function download(text, name) {
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function addEntry(e) {
    /* Zeitstempel streng steigend halten, sonst kollidieren Einträge beim Zusammenführen. */
    var prev = st.log.length ? st.log[st.log.length - 1].t : 0;
    if (e.t <= prev) e.t = prev + 1;
    st.log.push(e); st.boxes = CO.deriveBoxes(st.log); save();
  }
  /* Bittet den Browser, die Daten nicht bei Speicherknappheit zu löschen (klappt v. a. bei installierter App). */
  function askPersist() {
    if (!navigator.storage || !navigator.storage.persist) return;
    navigator.storage.persisted().then(function (p) { return p || navigator.storage.persist(); })
      .then(function (p) { st.persisted = p; if (st.tab === 'over') render(); }).catch(function () {});
  }
  function poolNow() { var r = RANGES[st.range]; return CO.pool(ROUTES, r[0], r[1]); }
  function nextQuestion() {
    var s = CO.pick(poolNow(), st.boxes, st.last, Math.random);
    st.cur = { score: s, darts: [], hint: false, res: null };
    st.mult = 'S';
  }
  function isBogey(s) { return !ROUTES[s]; }
  function $(id) { return document.getElementById(id); }

  function slotsHtml() {
    var c = st.cur, rem = c.score, h = '';
    for (var i = 0; i < 3; i++) {
      var d = c.darts[i];
      if (d) {
        rem -= CO.dartValue(d);
        h += '<div class="slot filled"><span class="d">' + CO.label(d) + '</span><span class="rest">Rest ' + rem + '</span></div>';
      } else if (c.hint && i === 0 && !c.res && ROUTES[c.score]) {
        h += '<div class="slot hint next"><span class="d">' + CO.label(ROUTES[c.score][0]) + '</span><span class="rest">Tipp</span></div>';
      } else {
        h += '<div class="slot' + (i === c.darts.length && !c.res ? ' next' : '') + '"><span class="empty">–</span><span class="rest">Dart ' + (i + 1) + '</span></div>';
      }
    }
    return h;
  }
  function resultHtml() {
    var c = st.cur, r = c.res;
    var std = ROUTES[c.score];
    var h = '<div class="result ' + (r.ok ? 'ok' : 'no') + '"><h2>' + r.title + '</h2>';
    if (r.body) h += '<p>' + r.body + '</p>';
    if (std) h += '<div><div class="lbl">Standardweg</div><div class="route">' + CO.routeText(std) + '</div></div>';
    h += '<p class="small">' + r.boxNote + '</p>';
    h += '<div class="actions"><button class="btn primary" data-a="next" id="nextbtn">Nächster Checkout</button></div></div>';
    return h;
  }
  function boxPill(s) {
    var b = st.boxes[s] || 0;
    return '<span class="box-pill"><i class="dot" style="background:' + BOXCOL[b] + '"></i>' + (b ? 'Box ' + b + ' von 5' : 'Neu') + '</span>';
  }
  function chipsHtml() {
    var h = '<div class="chips" role="group" aria-label="Zahlenbereich">';
    RANGES.forEach(function (r, i) { h += '<button class="chip" data-a="range" data-i="' + i + '" aria-pressed="' + (i === st.range) + '">' + r[2] + '</button>'; });
    return h + '</div>';
  }
  function padHtml() {
    var c = st.cur, full = c.darts.length >= 3;
    var h = '<div class="pad"><div class="mult" role="group" aria-label="Ring">';
    [['S', 'Single'], ['D', 'Double'], ['T', 'Triple']].forEach(function (m) {
      h += '<button class="m" data-a="mult" data-m="' + m[0] + '" aria-pressed="' + (st.mult === m[0]) + '">' + m[1] + '</button>';
    });
    h += '</div><div class="nums">';
    for (var n = 1; n <= 20; n++) h += '<button class="n" data-a="num" data-n="' + n + '"' + (full ? ' disabled' : '') + '>' + n + '</button>';
    var dbl = st.mult === 'D';
    h += '<button class="n bull" data-a="num" data-n="25" aria-label="' + (dbl ? 'Bull, 50' : 'Single Bull, 25') + '"' +
      (full || st.mult === 'T' ? ' disabled' : '') + '>' + (dbl ? 'Bull' : '25') + '</button>';
    h += '</div></div>';
    h += '<div class="actions four"><button class="btn" data-a="undo"' + (!c.darts.length ? ' disabled' : '') + '>Zurück</button>';
    h += '<button class="btn" data-a="hint"' + (c.hint || isBogey(c.score) ? ' disabled' : '') + '>Tipp: 1.&nbsp;Dart</button>';
    h += '<button class="btn" data-a="bogey">Nicht checkbar</button>';
    h += '<button class="btn primary" data-a="check"' + (!c.darts.length ? ' disabled' : '') + '>Prüfen</button></div>';
    return h;
  }
  function daysText(d) { return d === 0 ? 'heute' : d === 1 ? 'gestern' : 'vor ' + d + ' Tagen'; }
  /* Erinnerung an die Datei-Sicherung, einzeilig, damit das Training möglichst nicht scrollt. */
  function nudgeHtml() {
    if (st.msg) return '<p class="nudge done">' + CO.esc(st.msg) + '</p>';
    var b = CO.backupStatus(st.log, st.lastBackup, st.snoozeUntil, Date.now());
    if (!b.due) return '';
    var txt = b.days === null ? 'Noch nie gesichert' : 'Letzte Sicherung ' + daysText(b.days);
    return '<div class="nudge" role="note"><span>' + txt + '<span class="sr-only"> (' + b.fresh + ' neue Antworten)</span></span>' +
      '<button class="btn primary" data-a="export" aria-label="Jetzt als Datei sichern">Sichern</button><button class="btn ghost" data-a="snooze" aria-label="Bis morgen ausblenden">Später</button></div>';
  }
  function trainHtml() {
    var c = st.cur;
    var h = nudgeHtml() + chipsHtml();
    h += '<section class="board" aria-label="Aufgabe"><div class="score-row"><div><div class="lbl">Rest</div><div class="score">' + c.score + '</div></div>';
    h += '<div class="box-badge">' + boxPill(c.score) + '<span class="small">bis zu 3 Darts, Ende auf Double</span></div></div>';
    h += '<div class="slots">' + slotsHtml() + '</div>';
    /* Nach dem Prüfen ersetzt das Ergebnis das Tastenfeld, damit alles ohne Scrollen auf den Bildschirm passt. */
    h += c.res ? resultHtml() : padHtml();
    h += '</section>';
    h += '<details class="note"><summary>So wird bewertet</summary>Jeder gültige Weg zählt: Summe stimmt und der letzte Dart ist ein Double. Mit Tipp gibt es keine neue Box, ein Fehler setzt auf Box 1 zurück.</details>';
    return h;
  }
  function counts() {
    var c = [0, 0, 0, 0, 0, 0], p = poolNow();
    p.forEach(function (s) { c[st.boxes[s] || 0]++; });
    return { c: c, total: p.length, sits: c[4] + c[5] };
  }
  function problemsHtml(p) {
    var r = CO.problemNumbers(st.log, p, Date.now(), 30, 5), h = '<section class="problems" aria-labelledby="pr-h"><h2 id="pr-h">Problemzahlen <span class="small">letzte 30 Tage</span></h2>';
    if (!r.total) h += '<p class="small">Noch keine Antworten in diesem Bereich.</p>';
    else if (!r.list.length) h += '<p class="small">Keine Fehler bei ' + r.total + ' Antworten. Stark.</p>';
    else {
      h += '<ol class="plist">';
      r.list.forEach(function (a) {
        h += '<li><span class="pn">' + a.score + '</span><span class="pr">' + (isBogey(a.score) ? 'nicht checkbar' : CO.routeText(ROUTES[a.score])) + '</span>' +
          '<span class="pq">' + a.wrong + ' von ' + a.n + ' falsch</span></li>';
      });
      h += '</ol>';
      if (r.total < 50) h += '<p class="small">Erst ' + r.total + ' Antworten, die Liste wird mit mehr Training aussagekräftiger.</p>';
    }
    return h + '</section>';
  }
  function overviewHtml() {
    var p = poolNow(), k = counts(), h = '';
    h += chipsHtml();
    h += '<div class="prog"><div><b>' + k.sits + ' von ' + k.total + '</b> sitzen <span class="small">(Box 4 oder 5)</span></div><div class="bar" aria-hidden="true">';
    for (var b = 5; b >= 0; b--) if (k.c[b]) h += '<i style="width:' + (k.c[b] / k.total * 100) + '%;background:' + BOXCOL[b] + '"></i>';
    h += '</div><div class="legend">';
    h += '<span><i class="dot"></i>Neu ' + k.c[0] + '</span>';
    for (b = 1; b <= 5; b++) h += '<span><i class="dot" style="background:' + BOXCOL[b] + '"></i>Box ' + b + ': ' + k.c[b] + '</span>';
    h += '</div></div>';
    h += problemsHtml(p);
    h += '<div class="grid">';
    p.slice().reverse().forEach(function (s) {
      var b = st.boxes[s] || 0, bog = isBogey(s);
      h += '<div class="cell' + (bog ? ' bogey' : '') + '" style="--c:' + BOXCOL[b] + '"><span class="cn">' + s + '</span><span class="cr">' + (bog ? 'nicht checkbar' : CO.routeText(ROUTES[s])) + '</span>' + (b ? '<span class="cb">' + b + '</span>' : '') + '</div>';
    });
    h += '</div>';
    h += '<section class="backup" aria-labelledby="bk-h"><h2 id="bk-h">Sicherung</h2>';
    h += '<p class="small">Dein Fortschritt liegt in diesem Browser auf diesem Gerät (' + st.log.filter(function (e) { return !e.reset; }).length + ' Antworten). ';
    h += st.persisted === true ? 'Der Browser hat dauerhaftes Speichern zugesagt.' : 'Der Browser kann ihn bei Speichermangel oder beim Löschen der Website-Daten entfernen.';
    h += ' Eine Datei-Sicherung schützt davor und hilft beim Gerätewechsel.</p>';
    h += '<p class="small">Letzte Sicherung: <b>' + (st.lastBackup ? daysText(Math.floor((Date.now() - st.lastBackup) / 864e5)) : 'noch nie') + '</b></p>';
    h += '<div class="actions"><button class="btn" data-a="export"' + (st.log.length ? '' : ' disabled') + '>Sichern (Datei)</button>';
    h += '<button class="btn" data-a="import">Sicherung laden</button></div>';
    h += '<input type="file" id="importfile" accept="application/json,.json" hidden>';
    h += '<p class="small">' + (st.msg ? CO.esc(st.msg) : '') + '</p>';
    h += '</section><div class="resetbox">';
    if (st.confirmReset) {
      h += '<span>Alle Boxen auf Neu setzen?</span><button class="btn danger" data-a="reset-yes">Ja, zurücksetzen</button><button class="btn ghost" data-a="reset-no">Abbrechen</button>';
    } else h += '<button class="btn ghost" data-a="reset">Boxen zurücksetzen</button>';
    h += '</div><p class="note">Zurücksetzen stellt alle Zahlen auf Neu. Antworten, Tageszähler und Serie bleiben erhalten. Die Wege sind die gängigen Standardrouten.</p>';
    return h;
  }
  /* Selektor, der denselben Button nach dem Neuaufbau wiederfindet. */
  function focusKey(el) {
    if (!el || !el.dataset || !el.dataset.a) return null;
    var d = el.dataset, k = '[data-a="' + d.a + '"]';
    ['n', 'm', 'i', 't'].forEach(function (x) { if (d[x] != null) k += '[data-' + x + '="' + d[x] + '"]'; });
    return k;
  }
  function firstEnabled(sels) {
    for (var i = 0; i < sels.length; i++) { var el = document.querySelector(sels[i] + ':not([disabled])'); if (el) return el; }
    return null;
  }
  function render() {
    var app = $('app'), ae = document.activeElement;
    var fk = ae && ae !== app && app.contains(ae) ? focusKey(ae) : null;
    var s = CO.stats(st.log, Date.now());
    var h = '<header><h1>Checkout<span>.</span>Trainer</h1><div class="session">Heute <b>' + s.ok + '/' + s.n + '</b> richtig · Serie <b>' + s.streak + '</b></div></header>';
    if (st.saveFailed) h += '<p class="warn" role="alert">Speichern hat nicht geklappt. Bitte unter Übersicht eine Sicherung als Datei anlegen.</p>';
    if (st.damaged) h += '<div class="warn" role="alert"><p>Der gespeicherte Stand war beschädigt (' + CO.esc(st.damaged.problem) + '). Lesbare Antworten sind übernommen, eine Kopie des Originals liegt bereit.</p>' +
      '<div class="actions"><button class="btn" data-a="raw">Original als Datei sichern</button><button class="btn ghost" data-a="raw-hide">Ausblenden</button></div></div>';
    h += '<div class="tabs" role="tablist"><button class="tab" role="tab" data-a="tab" data-t="train" aria-selected="' + (st.tab === 'train') + '">Training</button><button class="tab" role="tab" data-a="tab" data-t="over" aria-selected="' + (st.tab === 'over') + '">Übersicht</button></div>';
    h += st.tab === 'train' ? trainHtml() : overviewHtml();
    var det = document.querySelector('details.note'), open = det && det.open;
    app.innerHTML = h;
    if (open && (det = document.querySelector('details.note'))) det.open = true;
    /* Fokus wiederherstellen, sonst springt er bei Tastaturbedienung nach jedem Druck an den Seitenanfang. */
    var target = null;
    if (st.tab === 'train' && st.cur.res) target = $('nextbtn');
    else if (fk) target = firstEnabled([fk, '[data-a="check"]', '[data-a="num"]', '[data-a="tab"][aria-selected="true"]']);
    if (target) target.focus({ preventScroll: true });
  }
  function finish(ok, title, body, nc) {
    var c = st.cur, old = st.boxes[c.score] || 0;
    addEntry(CO.makeEntry(Date.now(), c.score, ok, c.hint, c.darts, nc));
    var nb = st.boxes[c.score];
    var note = c.hint && ok ? 'Mit Tipp gelöst: Box bleibt bei ' + nb + '.' : (nb === old ? 'Box ' + nb + ' bleibt.' : (old ? 'Box ' + old : 'Neu') + ' → Box ' + nb + '.');
    c.res = { ok: ok, title: title, body: body, boxNote: note };
    st.last = c.score;
    announce(title + '. ' + body);
  }
  function check() {
    var c = st.cur, e = CO.evaluate(c.score, c.darts), std = ROUTES[c.score];
    if (e.ok) {
      var same = std && CO.routeText(std) === CO.routeText(c.darts);
      finish(true, 'Richtig', same ? 'Das ist der Standardweg.' : 'Ein anderer gültiger Weg, ' + CO.routeText(c.darts) + '.');
    } else if (!std) {
      finish(false, 'Nicht ganz', c.score + ' lässt sich mit drei Darts nicht checken.');
    } else if (e.sum !== c.score) {
      finish(false, 'Nicht ganz', 'Deine Darts ergeben ' + e.sum + ', gebraucht werden ' + c.score + '.');
    } else {
      finish(false, 'Nicht ganz', 'Die Summe passt, aber der letzte Dart muss ein Double sein.');
    }
  }
  function bogey() {
    var c = st.cur;
    if (isBogey(c.score)) finish(true, 'Richtig', c.score + ' ist mit drei Darts nicht checkbar. Setup-Dart spielen.', true);
    else finish(false, 'Nicht ganz', c.score + ' ist mit drei Darts checkbar.', true);
  }
  function exportLog() {
    syncFromStorage(readStored());
    download(JSON.stringify({ app: 'checkout-trainer', v: 2, exportedAt: new Date().toISOString(), range: RANGES[st.range][3], log: st.log }),
      'checkout-trainer-' + CO.dayKey(Date.now()) + '.json');
    st.lastBackup = Date.now(); st.snoozeUntil = 0; save();
    st.msg = 'Sicherung erstellt. Die Datei liegt in deinen Downloads.';
    announce(st.msg);
  }
  function importFile(file) {
    var r = new FileReader();
    r.onload = function () {
      var res = CO.parseBackup(String(r.result));
      if (res.error) st.msg = res.error;
      else {
        var before = st.log.length;
        st.log = CO.mergeLogs(st.log, res.log); st.boxes = CO.deriveBoxes(st.log); save();
        var added = st.log.length - before;
        st.msg = added ? added + ' Einträge übernommen. Vorhandene Antworten bleiben erhalten.' : 'Nichts Neues: Alle Einträge waren schon vorhanden.';
      }
      announce(st.msg); render();
    };
    r.onerror = function () { st.msg = 'Die Datei ließ sich nicht lesen.'; announce(st.msg); render(); };
    r.readAsText(file);
  }
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'importfile' && ev.target.files && ev.target.files[0]) importFile(ev.target.files[0]);
  });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.dataset.a, c = st.cur;
    if (a !== 'export' && a !== 'import') st.msg = null;
    if (a === 'tab') { st.tab = b.dataset.t; st.confirmReset = false; }
    else if (a === 'range') { st.range = +b.dataset.i; save(); nextQuestion(); }
    else if (a === 'raw') { download(st.damaged.raw, 'checkout-trainer-original-' + CO.dayKey(Date.now()) + '.json'); return; }
    else if (a === 'raw-hide') st.damaged = null;
    else if (a === 'snooze') { st.snoozeUntil = CO.endOfDay(Date.now()); save(); }
    else if (a === 'mult') st.mult = b.dataset.m;
    else if (a === 'num') {
      if (c.darts.length < 3 && !c.res) { c.darts.push({ m: st.mult, n: +b.dataset.n }); st.mult = 'S'; }
    }
    else if (a === 'undo') c.darts.pop();
    else if (a === 'hint') c.hint = true;
    else if (a === 'check') check();
    else if (a === 'bogey') bogey();
    else if (a === 'next') nextQuestion();
    else if (a === 'reset') st.confirmReset = true;
    else if (a === 'reset-no') st.confirmReset = false;
    else if (a === 'reset-yes') { addEntry({ t: Date.now(), reset: true }); st.confirmReset = false; }
    else if (a === 'export') exportLog();
    else if (a === 'import') { $('importfile').click(); return; }
    render();
  });
  /* Anderes Fenster hat gespeichert: dessen Antworten übernehmen. */
  window.addEventListener('storage', function (ev) {
    if (ev.key === KEY && syncFromStorage(ev.newValue)) render();
  });
  /* Tageszähler springt um Mitternacht um, auch wenn die App offen bleibt. */
  document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });

  load(); nextQuestion(); render(); askPersist();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js').catch(function () {});
})();

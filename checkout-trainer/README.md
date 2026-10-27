# Checkout-Trainer

Kleine PWA zum Lernen der Standard-Checkouts (2–170) im Steel Darts, mit Lernkartei (Leitner, Boxen 1–5).
Läuft unter `https://kornmischa-cmyk.github.io/sonnenkompass/checkout-trainer/`, eigenständig vom Sonnenkompass.

## Funktionen
- Bereiche 2–40, 41–80 (Standard), 81–120, 121–170, Alles.
- Übersicht: Boxen je Zahl, **Problemzahlen** (die 5 Zahlen mit den meisten Fehlern der letzten 30 Tage im gewählten Bereich).
- **Erinnerung an die Sicherung** als einzeiliges Banner im Training: erscheint, wenn seit der letzten Sicherung
  14 Tage vergangen sind (oder noch nie gesichert wurde) und mindestens 50 neue Antworten dazukamen.
  „Später" blendet sie bis Mitternacht aus. Schwellen: `BACKUP_DAYS`, `BACKUP_MIN` in `logic.js`.

## Dateien
- `index.html`, `style.css`, `app.js` – Oberfläche. Kein Build, die Dateien werden direkt ausgeliefert.
- `logic.js` – reine Logik (Bewertung, Boxen, Ziehung, Antwort-Log). Läuft im Browser und in Node.
- `routes.js` – die 162 Standardwege, Quelle der Wahrheit.
- `sw.js`, `manifest.json`, `icons/`, `fonts/` – PWA, offline, lokale Schriften (SIL OFL).

## Prüfen
```
node verify.js   # Standardwege: Summe, Double am Ende, keine Duplikate, genau die 7 Bogey-Zahlen fehlen
node test.js     # Bewertung, Boxen, Ziehung, Antwort-Log, Sicherung
node check-assets.js  # Offline-Liste in sw.js vollständig und ohne tote Einträge
```
Alle drei laufen automatisch bei jedem Push über `.github/workflows/checkout-trainer.yml`.

## Speichern
- localStorage-Schlüssel `checkout-trainer-v2`: `{ v: 2, range, lastBackup, snoozeUntil, log }`. `range` ist die feste Kennung
  des Bereichs (z. B. `"41-80"`), nicht die Position in der Liste.
- Gespeichert wird nur das Antwort-Log: `{ t, score, richtig, tipp, darts: ['T20','D20'], nc? }`.
  Boxen, „Heute x/y" (pro Kalendertag) und Serie (tagesübergreifend) werden daraus berechnet.
- „Boxen zurücksetzen" schreibt einen Marker `{ t, reset: true }`. Das Log bleibt für spätere Auswertungen erhalten.
- Sicherung: Übersicht → „Sichern (Datei)" / „Sicherung laden". Import führt zusammen, löscht nichts.
- Mehrere Fenster: Vor jedem Speichern wird der gespeicherte Stand eingemischt, und andere Fenster
  übernehmen Änderungen über das `storage`-Event. Dadurch geht keine Antwort verloren.
- Ist der gespeicherte Stand unlesbar, legt die App den Rohtext unter `checkout-trainer-v2-defekt` ab
  und bietet ihn als Datei an, statt ihn still zu überschreiben.

## Service Worker
Network-first: online immer die aktuelle Version, offline die zuletzt geladene. Antwortet das Netz
nicht innerhalb von 3 s, kommt die Cache-Version, danach 10 s lang alles aus dem Cache, damit die
Dateien zueinander passen. Bei neuen Dateien die Liste
`ASSETS` und den Cache-Namen in `sw.js` anpassen.

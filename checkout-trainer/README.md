# Checkout-Trainer

Kleine PWA zum Lernen der Standard-Checkouts (2–170) im Steel Darts, mit Lernkartei (Leitner, Boxen 1–5).
Läuft unter `https://kornmischa-cmyk.github.io/sonnenkompass/checkout-trainer/`, eigenständig vom Sonnenkompass.

## Dateien
- `index.html`, `style.css`, `app.js` – Oberfläche. Kein Build, die Dateien werden direkt ausgeliefert.
- `logic.js` – reine Logik (Bewertung, Boxen, Ziehung, Antwort-Log). Läuft im Browser und in Node.
- `routes.js` – die 162 Standardwege, Quelle der Wahrheit.
- `sw.js`, `manifest.json`, `icons/`, `fonts/` – PWA, offline, lokale Schriften (SIL OFL).

## Prüfen
```
node verify.js   # Standardwege: Summe, Double am Ende, keine Duplikate, genau die 7 Bogey-Zahlen fehlen
node test.js     # Bewertung, Boxen, Ziehung, Antwort-Log, Sicherung
```

## Speichern
- localStorage-Schlüssel `checkout-trainer-v2`: `{ v: 2, range, log }`.
- Gespeichert wird nur das Antwort-Log: `{ t, score, richtig, tipp, darts: ['T20','D20'], nc? }`.
  Boxen, „Heute x/y" (pro Kalendertag) und Serie (tagesübergreifend) werden daraus berechnet.
- „Boxen zurücksetzen" schreibt einen Marker `{ t, reset: true }`. Das Log bleibt für spätere Auswertungen erhalten.
- Sicherung: Übersicht → „Sichern (Datei)" / „Sicherung laden". Import führt zusammen, löscht nichts.

## Service Worker
Network-first: online immer die aktuelle Version, offline die zuletzt geladene. Bei neuen Dateien die Liste
`ASSETS` und den Cache-Namen in `sw.js` anpassen.

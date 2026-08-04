# Sonnenkompass – Projektkontext für Claude Code

## Was das Projekt ist
Eine Single-File-PWA (`index.html`), die per GPS den Sonnenauf- und -untergang als
drehenden Kompass anzeigt. Zusatzfunktion: Szenario-Modus für Zeltausrichtung
(Sonne/Schatten am Eingang, morgens/abends) und Strandmuschel-Ausrichtung
(Schatten für X Stunden).

Zielnutzer: der Repo-Owner selbst (Hobby-Camper, Steel-Darts-Spieler, UX Lead),
kein kommerzielles Produkt. Läuft auf Android/Chrome und iOS/Safari.

## Architekturprinzipien – bitte beibehalten
- **Eine Datei, kein Build-Setup.** `index.html` enthält HTML/CSS/JS inline.
  Kein npm, kein Bundler, kein Framework einführen – das war eine bewusste
  Entscheidung für maximale Einfachheit und Hostbarkeit auf GitHub Pages.
- **Keine externen Laufzeit-Requests.** Schriftarten lokal einbinden (siehe
  Aufgabe unten), keine Tracking-/Analytics-Skripte, keine CDN-Abhängigkeiten
  zur Laufzeit außer dem, was explizit gewünscht ist.
- **Alles läuft clientseitig.** Kein Server, keine Datenbank. Das ist auch das
  zentrale Datenschutz-Argument der App (siehe datenschutz.html) – nicht
  aufweichen.
- **DE als Sprache der UI**, Kommentare im Code dürfen Deutsch oder Englisch sein.
- **WCAG 2.1 AA** ist Anspruch, nicht Nice-to-have: Kontraste, Fokus-Sichtbarkeit,
  aria-live für dynamische Statusmeldungen, Touch-Targets ausreichend groß.

## Sonnenberechnung
Eigene Implementierung nach dem gängigen astronomischen Standardverfahren
(vgl. suncalc-Bibliothek, aber ohne Abhängigkeit nachgebaut). Wichtige Punkte,
falls daran gearbeitet wird:
- `sunPosition(date, lat, lon)` liefert Azimut (0°=Nord, im Uhrzeigersinn) und
  Höhe über Horizont.
- `sunTimes(date, lat, lon)` liefert Auf-/Untergang für den Kalendertag; gibt
  `null` zurück bei Polartag/-nacht (relevant, falls die App mal in Skandinavien
  genutzt wird).
- Zeitfenster-Logik (Zelt-Modus): Liegt ein Fenster (z. B. 07:00–10:00) bereits
  in der Vergangenheit, wird automatisch auf den nächsten Tag verschoben
  („morgen früh"-Regel) – das ist beabsichtigt, nicht anfassen ohne Rücksprache.

## Offene Aufgaben für die nächste Session
1. **Google Fonts lokal einbinden.** Aktuell lädt `index.html` Fraunces/Archivo
   per `<link>` von fonts.googleapis.com – das ist laut LG München ein
   DSGVO-Risiko (IP-Übertragung an Google ohne Einwilligung). Fonts als
   `.woff2` herunterladen, unter `fonts/` im Repo ablegen, per `@font-face`
   lokal einbinden, den `<link>`-Tag entfernen. `sw.js` cached bereits
   `fonts/fraunces.woff2` und `fonts/archivo.woff2` – Pfade ggf. anpassen.
2. **PWA verdrahten.** `manifest.json` und `sw.js` liegen im Repo-Root, sind
   aber noch nicht in `index.html` eingebunden:
   - `<link rel="manifest" href="./manifest.json">` in den `<head>`
   - Im Script: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js')`
   - App-Icons erzeugen (192/512, normal + maskable) und unter `icons/` ablegen
     – Vorlage: Sonnensymbol aus der App selbst, auf dunklem Hintergrund
     `#0B1220`, damit es zum Theme passt.
3. **Impressum & Datenschutz verlinken.** `impressum.html` und `datenschutz.html`
   liegen im Repo-Root. In `index.html` einen dezenten Footer-Link auf beide
   ergänzen (z. B. unten rechts, klein, `color: var(--muted)`).
4. **Impressum vervollständigen.** `impressum.html` enthält Platzhalter
   (`[VORNAME NACHNAME]` etc.) – vor jeder öffentlichen Weitergabe des Links
   mit echten Daten befüllen. Nicht automatisiert ausfüllen, das entscheidet
   der Owner selbst.

## Nicht tun ohne Rücksprache
- Keine Analytics/Tracking hinzufügen (widerspricht dem Datenschutz-Versprechen
  der App).
- Keine Abhängigkeit zu einem Sonnenberechnungs-API einführen (bewusst offline-
  fähig, bewusst ohne Server).
- Kein Redesign der Kompassrose/Farbpalette ohne expliziten Wunsch – aktuelles
  Farbschema (dunkles Nachthimmel-Blau, Bernstein/Orange für Sonne) ist Ergebnis
  mehrerer Iterationsrunden.

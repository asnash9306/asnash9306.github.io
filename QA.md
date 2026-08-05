# Selbst-QA / Abnahmeprotokoll

Stand: 5. August 2026

## Abnahmekriterien

- [x] Kompletter Loop: Start, Opening, Board, Dialoge, Minigames, DRUCKO 5000, Review und Restart.
- [x] Maximal drei aktive Anfragen, Backlog, zwei Eskalationsstufen, Boss-Geduld und Charakterstimmungen.
- [x] Feste Story-Beats von 09:00 bis 17:00 einschließlich Server-Alarm, KAFFEMAT und Drucker-Endgegner.
- [x] Zehn Minigames plus dreiphasiger Boss; alle vier vorgeschriebenen Kernspiele enthalten.
- [x] Zwei Quest-Ketten sowie perfekte KAFFEMAT-Questline für das Secret-Ending.
- [x] Acht Canvas-Pixelportraits aus eingebetteten 16×16-String-Maps; keine externen Bilddateien.
- [x] Kaffee-, Gedulds-, Uhr-, Phasen-, Stimmungs- und Quest-HUD vollständig.
- [x] GEFEUERT, EINGESCHLAFEN, drei Überlebt-Ränge, BEFÖRDERUNG und KAFFEMAT-Secret-Ending.
- [x] Restart räumt State, Timer und aktive Minigame-Session vollständig auf.
- [x] Relative Pfade, direkte Ausführung über `file://`, keine Build-Tools und keine Netzwerkressourcen.

## Automatisierte Prüfungen

- Syntaxprüfung aller vier JavaScript-Dateien bestanden.
- Browser-Smoke-Test über `file://`: 13 Screens/States, keine Konsolenfehler, kein horizontaler Overflow bei 390×844.
- Alle zehn Minigames und DRUCKO 5000 erfolgreich automatisiert abgeschlossen.
- Touch-Pointer für Buttons, HDMI-Drag, USB-Drag und Kaffee-Hold geprüft.
- Scheduler, Pflichtunterbrechung um 13:00, maximal drei Tickets und alle Enden geprüft.
- Restart setzt Kaffee und Geduld auf 100 und leert alle Abschlüsse.

## Visuelle Prüfung

Einzeln bei 390×844 geprüft: Start, Board, Quiz, WLAN, HDMI, USB, Passwort, Triage, Logs, Viren, Phishing, KAFFEMAT, DRUCKO und Endscreen. Zusätzlich wurden Start und Board bei 1440×900 geprüft. Toast-Stapelung und das mobile HDMI-Kabel wurden korrigiert und anschließend erneut gerendert. Längere Inhalte scrollen nur im vorgesehenen Spielpanel.

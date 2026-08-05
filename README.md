# IT-SURVIVAL: Der 9-to-5 Simulator

Ein vollständiges, story-getriebenes 2D-Browsergame für GitHub Pages. Reines HTML, CSS und Vanilla JavaScript; keine Build-Tools, kein Backend und keine externen Bild- oder Audiodateien.

## Sofort starten

1. Den Ordner entpacken.
2. `index.html` direkt im Browser öffnen **oder** den gesamten Ordner auf GitHub Pages veröffentlichen.
3. Auf **ARBEITSTAG STARTEN** klicken.

## Dateibaum

```text
it-survival/
├── index.html       # App-Shell, HUD, Dialog- und Endscreen
├── style.css        # Responsive Retro-UI, Animationen, Minigame-Visuals
├── characters.js    # 8 eingebettete 16×16-Pixelmaps + Canvas-Renderer
├── story.js         # Charakterdialoge, Quests, Ketten und feste Story-Beats
├── minigames.js     # 10 Minigames + dreiphasiger Drucker-Boss
├── game.js          # State-Machine, Scheduler, Ressourcen, Audio, Enden
└── README.md
```

## Architekturplan

### State-Machine

`START → DIALOG → BOARD → MINIGAME → REAKTION → BOARD`

Pflicht-Events unterbrechen das Board bei 13:00, 15:30 und 16:45. Nach DRUCKO 5000 folgt das Review um 17:00. Kaffee oder Boss-Geduld können jederzeit vorzeitige Enden auslösen. Ein Restart erzeugt einen vollständig neuen State und räumt alle Timer sowie Listener der aktiven Minigame-Session auf.

### Datenmodell

- **Charaktere:** Pixelmap, Palette, Anzeigename und Stimmung.
- **Quests:** Freischaltzeit, optionale Vorgängerquest, Dialoge, Minigame, Zeitkosten, Belohnung und zwei Eskalationstexte.
- **Ticket-Metadaten:** Eingangszeit, Eskalationsstufe und Typewriter-Fortschritt.
- **Run-State:** Uhrzeit, Ressourcen, Board/Backlog, abgeschlossene Quests, Stimmungen, Story-Flags und Statistik.

### Inhalte

1. Kevins Fachwissen-Quiz
2. Gast-WLAN / Simon-Sequenz
3. Janas HDMI-PC-Rückseitenpuzzle
4. Janas USB-Maus-Puzzle
5. Frau Kalks Passwort-Ping-Pong
6. Kevins Swipe-Triage
7. Server-Loganalyse (Pflicht-Event)
8. Mogels Viren-Jagd
9. Mogels Phishing-Filter (Folgequest)
10. KAFFEMAT-Extraktion (Pflicht-Event und Secret-Pfad)
11. DRUCKO 5000: Papierstau, Toner und Treiber-Duell

## Steuerung

- Buttons: Touch oder Mausklick
- HDMI/USB/Triage: ziehen bzw. wischen; alternative Buttons, wo sinnvoll
- Kaffee: gedrückt halten und im Zielbereich loslassen
- Dialoge: **WEITER**; ein erster Klick beendet den Typewriter sofort
- Ton: Schalter im Startscreen und HUD; Einstellung bleibt im Browser gespeichert

## GitHub Pages

Alle Pfade sind relativ. Der Ordner kann unverändert als Repository-Root verwendet werden:

1. Dateien in ein GitHub-Repository laden.
2. **Settings → Pages** öffnen.
3. **Deploy from a branch**, Branch `main`, Ordner `/ (root)` wählen.
4. Speichern und die veröffentlichte URL öffnen.

## Technische Eigenschaften

- Funktioniert über `file://` und als statische Website.
- Keine Netzwerkzugriffe, Frameworks, Bilddateien oder Audiodateien.
- Pixelportraits werden aus String-Maps auf Canvas gerendert.
- Audio entsteht optional mit WebAudio-Oszillatoren.
- App-Ebene bleibt auf `100dvh` ohne Seiten-Scroll; einzelne Spielbereiche scrollen kontrolliert.
- Touch-Ziele sind mindestens 44 px groß; Tastaturfokus ist sichtbar.
- `prefers-reduced-motion` wird berücksichtigt.

# AlfCasino Bonus Tool

Moderne, streamer-freundliche Single-Page Website für **Orangebonus** – komplett clientseitig, optimiert für OBS Browser Sources und Twitch-Streams.

## Features

| Bereich | Beschreibung |
|---------|-------------|
| **A-Z Bonus Hunt** | 26 Spalten (A–Z) mit je einem zufälligen Bonus-Slot, reproduzierbar per Seed |
| **Free Spins Liste** | Alle Bonus-Slots, filterbar nach Provider und Suchbegriff |
| **Bingo 5×5** | 25 zufällige Slots, anklickbar zum Markieren (grün = gespielt) |
| **Bonus Wheel** | Animiertes Glücksrad mit Canvas, 24 zufällige Segmente |
| **Themed Sessions** | 12 Themes (Halloween, Weihnachten, Ocean, …) mit passenden Slots |
| **Community Hunt** | Twitch-Chat-Eingaben (`!Bonushunt Slotname`) mit Duplikat-Schutz (30 Min.) |

## Projektstruktur

```
├── index.html      # Hauptseite mit Navigation und allen Bereichen
├── script.js       # Gesamte App-Logik (Vanilla JS)
├── style.css       # Custom Styles (Dark Mode, Orange-Theme)
├── slots.json      # Slot-Datenbank (leicht erweiterbar)
└── README.md       # Diese Datei
```

## Lokal testen

Da die App `slots.json` per `fetch()` lädt, brauchst du einen lokalen Webserver (kein `file://`):

```bash
# Option 1: npx (Node.js)
npx serve .

# Option 2: Python
python -m http.server 8080

# Option 3: VS Code Live Server Extension
```

Dann im Browser öffnen: `http://localhost:3000` (bzw. Port 8080).

## Slots erweitern

Neue Slots in `slots.json` hinzufügen – jedes Objekt braucht:

```json
{
  "name": "Neuer Slot Name",
  "provider": "Pragmatic Play",
  "hasBonus": true,
  "bonusDescription": "10 Free Spins mit Multiplier",
  "themes": ["summer", "ocean"],
  "startingLetter": "N"
}
```

`startingLetter` wird automatisch aus dem Namen berechnet, wenn es fehlt. Nur Slots mit `"hasBonus": true` erscheinen in der App.

## Deployment auf GitHub Pages

### Schritt 1: Repository erstellen

1. Gehe zu [github.com/new](https://github.com/new)
2. Repository-Name z. B. `orangebonus-bonus-tool` oder `Orangebonus-streamwebsite`
3. **Public** wählen (GitHub Pages ist für Public Repos kostenlos)
4. Repository erstellen

### Schritt 2: Code hochladen

```bash
cd Orangebonus-streamwebsite

git init
git add index.html script.js style.css slots.json README.md
git commit -m "Initial commit: AlfCasino Bonus Tool"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/DEIN-REPO.git
git push -u origin main
```

> Ersetze `DEIN-USERNAME` und `DEIN-REPO` mit deinen GitHub-Daten.

### Schritt 3: GitHub Pages aktivieren

1. Repository auf GitHub öffnen
2. **Settings** → **Pages** (linke Sidebar)
3. Unter **Source** → **Deploy from a branch**
4. Branch: `main`, Folder: `/ (root)`
5. **Save** klicken

Nach 1–2 Minuten ist die Seite live unter:

```
https://DEIN-USERNAME.github.io/DEIN-REPO/
```

### Schritt 4: OBS Browser Source (optional)

1. OBS → Quelle hinzufügen → **Browser**
2. URL: `https://DEIN-USERNAME.github.io/DEIN-REPO/`
3. Breite: `1920`, Höhe: `1080` (oder nach Bedarf)
4. ✅ „Shutdown source when not visible" deaktivieren für bessere Performance

## Community Hunt – Twitch-Integration

Die statische Website kann keinen echten Twitch-Chat lesen. Drei Workarounds:

1. **Manuell:** Chat-Nachrichten im Format `!Bonushunt Gates of Olympus` ins Eingabefeld kopieren
2. **StreamElements:** Custom Command, der die Nachricht in ein Overlay schreibt
3. **Browser-Userscript:** Tampermonkey-Script, das Twitch-Chat liest und in die Seite injiziert

Duplikate desselben Slots werden **30 Minuten** lang blockiert (localStorage).

## Technologie

- HTML5 + [Tailwind CSS](https://tailwindcss.com/) (CDN)
- Vanilla JavaScript (kein Framework)
- Canvas API (Bonus Wheel)
- localStorage (Community Hunt, A-Z Seed)

## Lizenz

Frei nutzbar für Orangebonus Streams. Slot-Daten sind Beispieldaten und können jederzeit angepasst werden.
# Dagscore To-do

Eenvoudige, lokale to-do webapp in je browser. Je maakt taken per dag aan en elke voltooide taak telt automatisch 1 punt voor je dagscore. Alles wordt opgeslagen in `localStorage` en blijft dus bewaard op je eigen apparaat.

## Functies
- Taken per datum beheren met een datumkiezer
- Taken toevoegen, afvinken, verwijderen
- Dagscore = aantal voltooide taken
- Permanente opslag in je browser

## Snel starten
1. Open `index.html` via een live preview of serveer de map als statische site.
2. Kies de datum, voeg taken toe en vink ze af. De score wordt direct bijgewerkt.

### Optie A: via Python (universeel)
Terminal:
```bash
cd /workspace/day-score-todo
python3 -m http.server 8080
```
Open daarna in je browser: `http://localhost:8080`

### Optie B: via Cursor/VS Code Live Preview
- Klik met rechts op `index.html` en kies “Open with Live Server” of gebruik de ingebouwde preview.

## Privacy
- Alle data staat in `localStorage` onder de sleutel `dayScoreTodo.v1`
- Er is geen backend: niets verlaat je apparaat.

## Aanpassen
- Scorelogica wijzigen? Open `script.js` en pas `updateScore` aan.
- Stijlen: `styles.css`.
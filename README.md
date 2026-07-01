# Sales Follow-up Cockpit (MVP)

Een persoonlijke sales-executie cockpit — **geen CRM**. Het doel: voorkomen dat
je geld laat liggen doordat je opvolging vergeet. Elke ochtend zie je binnen 30
seconden wat je moet doen.

> Bewust géén klantdata: geen e-mailadressen, telefoonnummers, contactpersonen
> of automatische CRM-koppeling. Alleen wat je nodig hebt om op te volgen.

## Gebruiken

Geen build-stap, geen server nodig. Open `index.html` in je browser:

```bash
# optie 1: dubbelklik index.html
# optie 2: lokaal serveren (aanbevolen)
python3 -m http.server 8000
# open daarna http://localhost:8000
```

Alle data staat lokaal in je browser (`localStorage`). Er gaat niets naar buiten.
Bij eerste gebruik staat er wat demo-data; die kun je bewerken of verwijderen.

## Wat het doet

Bovenaan zie je in één oogopslag: **taken vandaag**, **taken te laat** en
**afgerond vandaag**.

Daaronder vijf lijsten:

1. **Te laat** — opvolgingen waarvan de datum verstreken is
2. **Vandaag** — wat je vandaag moet doen
3. **Morgen**
4. **Komende 7 dagen**
5. **Afgerond vandaag**

Elke taakkaart toont bedrijfsnaam, actie, opvolgdatum, status, prioriteit,
notitie en optioneel de grove dealwaarde. Per kaart: **Gedaan**,
**Nieuwe datum** en **Bewerken**.

## Follow-up taak

Minimale velden:

- **Bedrijfsnaam** (verplicht)
- **Type actie**: bellen, reminder mail, wachten op klant, offerte opvolgen, handmatige actie
- **Opvolgdatum**
- **Status**: open, gedaan, wachten, gewonnen, verloren
- **Prioriteit**: laag, normaal, hoog
- **Korte notitie**
- **Grove dealwaarde** (optioneel)

### Automatische opvolgregel

Vink bij een nieuwe taak **"Offerte gestuurd"** aan en het systeem stelt
automatisch twee losse opvolgtaken voor:

- **Reminder mail** na 3 dagen
- **Bellen** na 7 dagen

Beide datums (en of ze überhaupt worden aangemaakt) pas je altijd handmatig aan
— bijvoorbeeld als de klant zegt dat hij pas volgende week tijd heeft.

## Techniek

Bewust simpel gehouden, geen framework:

- `index.html` — structuur en formulieren
- `styles.css` — opmaak, snel scanbaar dashboard
- `app.js` — logica + opslag in `localStorage`

De dataopslag zit geïsoleerd in één `store`-object in `app.js`, zodat we later
eenvoudig kunnen overstappen op bijvoorbeeld Supabase zonder de rest te raken.

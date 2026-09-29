# Handleiding website Huisartsenpraktijk Smits & Canoy

De website is gemaakt met **Jekyll**. GitHub Pages bouwt de site automatisch: je past een tekstbestand aan, en binnen een minuut of twee staat de wijziging online. Je hoeft zelf niets te installeren.

---

## 1. De site online zetten (eenmalig)

1. Log in op [github.com](https://github.com) en klik rechtsboven op **+ → New repository**.
2. Noem de repository **`smitscanoy`**, kies **Public** en klik op **Create repository**.
3. Klik op **uploading an existing file** en sleep **de inhoud** van de map `Website` naar het venster: alle bestanden en mappen, maar niet de map `Website` zelf. Klik op **Commit changes**.
   - Tip: met [GitHub Desktop](https://desktop.github.com) gaat uploaden en bijwerken makkelijker.
4. Ga naar **Settings → Pages**. Kies bij *Source* **Deploy from a branch**, branch **main** en map **/ (root)**. Klik op **Save**.
5. Na 1 à 2 minuten staat de site op `https://<jouw-gebruikersnaam>.github.io/smitscanoy/`.

> Heet de repository anders? Pas dan in `_config.yml` de regel `baseurl: "/smitscanoy"` aan naar de nieuwe naam.

### Later een eigen domein koppelen (bijv. www.smitscanoy.nl)

1. Ga in GitHub naar **Settings → Pages → Custom domain**, vul het domein in en klik op **Save**. Zet daarna **Enforce HTTPS** aan.
2. Stel bij je domeinprovider een CNAME-record in: `www` → `<jouw-gebruikersnaam>.github.io`.
3. Zet in `_config.yml` de baseurl op leeg: `baseurl: ""`

---

## 2. Teksten aanpassen

Open op github.com het bestand, klik op het **potloodje** (Edit), pas de tekst aan en klik op **Commit changes**.

| Wat wil je aanpassen? | Bestand |
| --- | --- |
| Telefoonnummers, adres, openingstijden | `_data/praktijk.yml` |
| Het menu | `_data/menu.yml` |
| Medewerkers (naam, functie, dagen, foto) | `_data/team.yml` |
| Veelgestelde vragen | `_data/faq.yml` |
| Homepage | `index.html` |
| Pagina's onder "Ons team" | map `ons-team/` |
| Formulieren | map `formulieren/` |
| Handige info | map `handige-info/` |
| Contactpagina | `contact.html` |

Pagina's zijn gewone tekst in **Markdown**:

```markdown
## Een tussenkopje
Gewone tekst. **Vetgedrukt** en *schuin*.

- een opsommingsteken
- nog een

[Tekst van een link](/contact/)            ← link naar een pagina op de site
[Thuisarts](https://www.thuisarts.nl)      ← link naar een andere website
```

Bovenaan elke pagina staat een blokje tussen `---` (de "front matter"):

```yaml
---
title: De huisarts                      # grote groene titel
subtitel: Het mooiste vak ...           # groene ondertitel
hero: /assets/img/balie.jpg             # foto bovenaan (of: plaatshouder / false)
---
```

---

## 3. Een nieuwsbericht plaatsen

1. Open de map `_posts` en klik op **Add file → Create new file**.
2. Geef het bestand een naam in de vorm `JJJJ-MM-DD-korte-titel.md`, bijvoorbeeld `2026-10-15-griepprik.md`.
3. Plak dit erin en pas het aan:

```markdown
---
title: "De griepprik komt eraan"
date: 2026-10-15
---
Eerste alinea. Deze tekst verschijnt ook in het nieuwsoverzicht op de homepage.

Meer tekst...
```

Optioneel:
- `afbeelding: /assets/img/nieuws/griep.jpg` → een eigen foto. Zonder deze regel verschijnt een groene plaatshouder.
- `bron: https://www.thuisarts.nl/...` → een extra knop "Lees het hele bericht op Thuisarts.nl".

De 4 nieuwste berichten verschijnen automatisch op de homepage.

---

## 4. Foto's toevoegen

- **Medewerker:** zet de foto (vierkant, bijv. 400×400 px) in `assets/img/team/` en voeg in `_data/team.yml` bij die persoon een regel `foto: bestandsnaam.jpg` toe.
- **Grote foto bovenaan een pagina:** zet de foto (liggend, minstens 1600 px breed) in `assets/img/` en zet in de front matter van de pagina `hero: /assets/img/bestandsnaam.jpg`.
- **Logo:** `assets/img/logo.png`

Maak foto's niet groter dan nodig (maximaal ± 300 kB), dan blijft de site snel.

---

## 5. Goed om te weten

- **Geen cookies, geen cookiemelding.** De site gebruikt geen statistieken of trackers, en de lettertypen staan op de site zelf. Voeg je later Google Analytics, een YouTube-video of een Google Maps-kaart toe, dan heb je wél een cookiemelding nodig.
- **Geen formulieren die gegevens versturen.** Het inschrijfformulier wordt geprint en afgegeven aan de balie. Medische vragen lopen via MijnGezondheid.net. Zo gaan er geen medische gegevens over de website.
- **Voorlezen** gebruikt de spraakfunctie van de browser zelf. De kwaliteit van de stem verschilt per apparaat.
- **Zoeken** doorzoekt automatisch alle pagina's, nieuwsberichten en veelgestelde vragen.

### Lokaal bekijken (optioneel, voor gevorderden)

Met Ruby en Jekyll op je computer:

```bash
gem install jekyll -v 3.10.0 kramdown-parser-gfm webrick
jekyll serve
```

Open daarna http://localhost:4000/smitscanoy/

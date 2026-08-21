# Migraine Risk Card for Home Assistant

A science-backed environmental migraine risk monitoring card for Home Assistant. It tracks up to 9 weather and air-quality factors known to trigger migraines and shows a composite risk score on a visual gauge — plus tomorrow's outlook.

![Migraine Risk Card](https://raw.githubusercontent.com/undel-gh/migraine-risk-card/main/docs/card-preview.png)

## Why I Built This

I'm a chronic migraine sufferer, and over the years I've learned that my migraines don't just appear out of nowhere — they follow the weather. A pressure drop before a storm front, a sudden temperature swing, poor air-quality days — these are the invisible triggers that can send me reaching for medication hours later.

Knowing this changed everything for me. If I can see the environmental warning signs *before* symptoms hit, I can take my preemptive medication early and actually get ahead of an attack instead of chasing it. So I built a system in Home Assistant that watches the weather for me and tells me when conditions are stacking up.

I shared a few screenshots of my dashboard with friends, and then they shared them, and before long people were asking how they could set it up for themselves. So here it is — the same system I rely on every day, packaged up for anyone who wants to take back a little control from their migraines.

I hope it helps you as much as it's helped me.

## What's New in 3.0

**The card is now self-sufficient — the sensor package is optional.** Point any factor at a `weather.*` entity and the card does the rest itself:

- **Pressure and temperature trends** are computed in-card from Home Assistant's own recorder history — no helper sensors, no automations. Point a pressure factor at your barometer *or* a weather entity and it works out the change over 6h/24h for you.
- **Storms and tomorrow's forecast** come from the live forecast feed (`weather/subscribe_forecast`) — the same mechanism the built-in weather card uses.
- **Reads weather-entity attributes directly** — temperature, humidity, wind, UV and pressure are pulled from the entity's attributes, so a single `weather.*` entity can feed most of the card.
- **Unit-aware** — mixes sources freely and normalises them (°F→°C, mmHg/inHg→hPa, m/s / mph / kn→km/h) for scoring while showing each value in its own units.
- **Translations** — English and Russian, auto-selected from your Home Assistant language, with a manual override in the editor.

The result: everything updates through HACS with one click. The sensor package is still worth installing if you want **server-side scoring, notifications/automations, or the bundled WAQI air-quality sensors** — see [Optional: the sensor package](#optional-the-sensor-package).

## Features

- **Up to 9 environmental factors** — barometric pressure change (6h & 24h), humidity, temperature extremes, rapid temperature change, wind speed, UV index, thunderstorm proximity, and air quality (AQI)
- **Composite risk score** on a 0–22 scale with four levels (Low, Moderate, High, Very High)
- **Tomorrow's forecast** — next-day risk computed from your weather entity's forecast
- **Works with any weather integration** — Met.no, OpenWeatherMap, Gismeteo, Yandex, BOM, or any provider that creates a `weather.*` entity
- **Optional air quality** — connect a WAQI/OpenAQ/any AQI sensor for the pollution factor
- **Show only what you configure** — unconfigured factors simply don't appear, and the gauge maximum adjusts to match
- **English & Russian UI**, auto-detected — [add your language](#adding-a-language) with a single JSON file
- **Dark-theme design** with colour-coded tiles and a semicircular gauge

## Installation

### Step 1 — Install the card via HACS

1. Open **HACS** in the sidebar.
2. Three-dot menu → **Custom repositories**.
3. Repository: `https://github.com/undel-gh/migraine-risk-card`, category **Dashboard**.
4. **Add**, then find **Migraine Risk Card** and click **Download**.

> Modern HACS registers the dashboard resource for you — you do **not** need to add a resource manually under *Settings → Dashboards → Resources*. Adding one by hand creates a **second, un-cache-busted copy** of the card, which loads an old version alongside the new one. If your card ever looks out of date or the language selector vanishes, check for a duplicate resource — see [Troubleshooting](#troubleshooting).

After downloading, hard-refresh your browser (**Ctrl+F5**). Open the browser console (F12) and you should see a single banner: `🧠 Migraine Risk Card v3.2.0`.

### Step 2 — Add the card to a dashboard

**Through the UI (easiest):**
1. Edit your dashboard (pencil icon) → **+ Add Card**.
2. In the **Custom** section, pick **Migraine Risk Card**.
3. Fill in the entity mappings in the editor and **Save**.

**YAML — self-sufficient setup (recommended):** one weather entity feeds most factors; add a barometer and an AQI sensor if you have them.

```yaml
type: custom:migraine-risk-card
entity_pressure_6h: weather.home        # or a dedicated barometer sensor
entity_pressure_24h: weather.home       # (the card computes the change from history)
entity_humidity: weather.home
entity_temperature: weather.home
entity_temperature_change: weather.home # computed from 6h of recorder history
entity_wind_speed: weather.home
entity_uv_index: weather.home
entity_storm: weather.home              # thunderstorm from the live forecast
entity_forecast: weather.home           # tomorrow's risk from the forecast
entity_air_quality: sensor.waqi_home    # optional — omit to hide the tile
```

Every factor is optional. Omit a line and that tile disappears and the gauge maximum drops accordingly.

## Configuration Options

| Option | Type | Description |
|---|---|---|
| `entity_pressure_6h` | entity | Pressure change over 6h. Give it a barometer or a weather entity; absolute pressure is auto-detected and the change is derived from history. |
| `entity_pressure_24h` | entity | Pressure change over 24h (as above). |
| `entity_humidity` | entity | Relative humidity (sensor, or `humidity` attribute of a weather entity). |
| `entity_temperature` | entity | Current temperature. |
| `entity_temperature_change` | entity | 6h temperature change. A weather entity or absolute-temperature sensor is fine — the change is computed from history. |
| `entity_wind_speed` | entity | Wind speed (any unit; normalised to km/h for scoring). |
| `entity_uv_index` | entity | UV index. |
| `entity_storm` | entity | Thunderstorm factor. A weather entity uses the live forecast; a sensor is read directly. |
| `entity_air_quality` | entity | AQI sensor (e.g. WAQI). Omit to hide the factor. |
| `entity_forecast` | entity | Tomorrow's outlook. A `weather.*` entity is computed in-card; a `sensor.migraine_risk_forecast_tomorrow` from the package is read directly. |
| `entity_risk_score` | entity | *Integration mode only.* A pre-computed score sensor from the package. **Leave empty for standalone mode** — otherwise the card shows this value instead of its own calculation. |
| `entity_risk_level` | entity | *Integration mode only.* Pre-computed risk level from the package. |
| `title` | string | Optional heading shown on the card — handy when you run one card per location. |
| `displayUnits` | `metric` \| `imperial` | Display units only; scoring is always metric. Default `metric`. |
| `language` | `auto` \| `en` \| `ru` | UI language. Default `auto` (from Home Assistant). |
| `theme` | `auto` \| `dark' \| `light` | UI theme. Default `auto` (from Home Assistant). |
| `translations_path` | string | Override where translation files are served from (only needed for non-standard installs). |
| `max_score` | number | Override the gauge maximum (integration mode). Leave empty for automatic. |
| `thresholds` | object | Personal trigger thresholds — see [Calibration](#calibrating-to-your-personal-triggers). |

> **Standalone vs integration mode:** if `entity_risk_score` is set, the card trusts that sensor and ignores its own per-factor scoring. For the self-sufficient setup above, **leave `entity_risk_score` and `entity_risk_level` empty** so the gauge reflects the tiles you configured.

## Data-source notes

A few things worth knowing when choosing what to feed each factor:

- **Pressure — a physical barometer wins.** It reports every minute versus a weather provider's 30–60 min, so a falling front shows up hours earlier. Pressure is spatially smooth and a barometer can live indoors, so it's immune to sun/radiation error. The card reads absolute pressure and derives the change from history — no calibration needed.
- **Temperature & humidity — trust a good local sensor, but beware radiation error.** A poorly-shielded outdoor sensor that over-reads in morning sun will inflate the temperature factors *and* depress humidity at the same time. Until shielding is sorted, a weather integration is often the safer source. Pick one humidity source and stick with it — providers can disagree by 10%+.
- **AQI is not in weather entities.** The Home Assistant `weather` domain has no air-quality field — no provider exposes it there. Use a dedicated integration (WAQI, AirVisual, OpenWeatherMap Air Pollution) and point `entity_air_quality` at its sensor. If the nearest monitoring station is far away, consider leaving the factor off rather than scoring someone else's air.
- **Recorder must be on for the pressure/temperature-change factors.** The card reads history from the recorder, so the chosen entity must not be excluded from recording. If a change factor shows `…` forever, check your `recorder:` `exclude:` config.

## Optional: the sensor package

The bundled `sensor-package/migraine_sensors.yaml` reproduces the scoring **server-side** and adds things the card can't do on its own: notifications and automations, history you can graph, and WAQI air-quality sensors (AQI/PM2.5/PM10/ozone). It's entirely optional in 3.0.

1. Enable packages in `configuration.yaml`:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
2. Download the **latest** `migraine_sensors.yaml` and save it to `/config/packages/`:
   - [migraine_sensors.yaml on main](https://raw.githubusercontent.com/undel-gh/migraine-risk-card/main/sensor-package/migraine_sensors.yaml) (right-click → Save As), or from the [latest release](https://github.com/undel-gh/migraine-risk-card/releases/latest) → Assets.
   > **Always re-download; don't reuse an old local copy** — older versions had scoring bugs.
3. **Restart Home Assistant** (not just *Reload Template Entities* — the package registers trigger-based sensors and helpers).
4. Set your sources under **Settings → Devices & Services → Helpers** — the `Migraine Source: …` helpers. At minimum set **Weather Entity**; leave any you don't have blank.
5. Point the card at the package's sensors if you want the gauge to match the server-side score exactly:
   ```yaml
   entity_risk_score: sensor.migraine_risk_score
   entity_risk_level: sensor.migraine_risk_level
   entity_forecast: sensor.migraine_risk_forecast_tomorrow
   ```

The package fetches forecasts with the modern `weather.get_forecasts` action (weather entities no longer expose a `forecast` attribute) and detects thunderstorms from both the forecast and warning/forecast text — English and Russian keywords are recognised.

## Translations

The UI ships in English and Russian. The language follows your Home Assistant setting automatically; override it per card with `language:` in the config or the **Language** selector in the editor.

Translations live in plain JSON files next to the card:

```
dist/
├── migraine-risk-card.js
└── translations/
    ├── en.json
    └── ru.json
```

English is also embedded in the card as a guaranteed fallback, so a missing or failed translation file never leaves the UI blank — untranslated keys quietly fall back to English.

### Adding a language

No JavaScript knowledge required for the translation itself:

1. Copy `dist/translations/en.json` to `dist/translations/<code>.json` (ISO 639-1, e.g. `de.json`).
2. Translate the values — keep every key exactly as it is.
3. Add the code to `AVAILABLE_LANGS` near the top of `src/migraine-risk-card.js` (and copy `src/` to `dist/`).
4. Open a PR. CI checks that your file covers every key in `en.json` and that `AVAILABLE_LANGS` matches the shipped files.

> **Packaging note:** because the card ships more than one file, `hacs.json` deliberately has **no** `filename` key — that makes HACS download the whole `dist/` directory, translations included. Keep every shipped asset inside `dist/`.

## Calibrating to Your Personal Triggers

The default thresholds are research-based averages, but migraine triggers are highly individual — one person reacts to a 4 hPa pressure drop, another only past 10. Since v3.1 every scoring threshold can be tuned to your own history, no YAML editing required.

**In the card editor (easiest):** open the card's visual editor and expand **Calibration — personal thresholds**. Each factor shows one box per point step; the placeholder is the value currently in effect (your `input_number` helper if you have one, otherwise the research default). Leave a box empty to keep using that value.

**With the sensor package installed:** go to **Settings → Devices & Services → Helpers** and search "Migraine Threshold". You'll find 20 sliders — the point steps for every factor (e.g. *Pressure 6h → 1 pt*, default 4 hPa). Change a value and both the server-side scoring **and the card** pick it up immediately: the card reads the same helpers automatically, so one calibration applies everywhere.

**Without the package:** create `input_number` helpers with the well-known IDs (`input_number.migraine_threshold_pressure_6h_1` … see the table below), or set thresholds directly in the card config:

```yaml
type: custom:migraine-risk-card
# ...
thresholds:
  pressure_6h: [3, 5, 7, 9]   # point ladder: ≥3 → 1pt, ≥5 → 2 … 
  humidity_low: 25             # dry-air trigger
  uv: [5, 7]
```

Card config takes precedence over helpers; helpers take precedence over defaults. Available keys and their defaults:

| Key | Default | Meaning |
|---|---|---|
| `pressure_6h` | `[4, 6, 8, 10]` | hPa drop over 6h → 1/2/3/4 pts |
| `pressure_24h` | `[6, 10, 14]` | hPa drop over 24h → 1/2/3 pts |
| `humidity_low` | `30` | below this % → 1 pt (dry air) |
| `humidity_high` | `80` | above this % → 2 pts |
| `temp_hot` | `30` | above this °C → 2 pts |
| `temp_cold` | `5` | below this °C → 2 pts |
| `temp_change` | `[5, 8]` | °C change over 6h → 1/2 pts |
| `wind` | `[35, 50]` | km/h → 1/2 pts |
| `uv` | `[6, 8]` | UV index → 1/2 pts |
| `aqi` | `[50, 100, 150]` | AQI above step → 1/2/3 pts |

Matching helper IDs: array keys get `_1`, `_2`, … suffixes (`migraine_threshold_uv_1`), scalar keys use the name as-is (`migraine_threshold_humidity_low`).

**How to calibrate:** when a migraine hits, note the card's factor tiles (or the `sensor.migraine_risk_score` attributes). If attacks reliably arrive at pressure drops the card scores 0–1, lower the pressure steps; if UV never seems to matter for you, raise the UV steps so the factor stays quiet. Adjust one factor at a time and give each change a couple of weeks of history before the next tweak.

### Multiple locations

Each card instance keeps its own history cache and forecast subscription, so you can put several cards on one dashboard — one per home — each pointing at a different weather entity. Give each a `title:` to tell them apart. Threshold helpers are global (they describe *you*, not the house), but a per-card `thresholds:` block overrides them if a location really needs different values.

## How the Scoring Works

Nine factors, each scored on a 0–2 or 0–4 scale:

| Factor | Max | Thresholds |
|---|---|---|
| Pressure change (6h) | 4 | ≥4 hPa: 1 · ≥6: 2 · ≥8: 3 · ≥10: 4 |
| Pressure change (24h) | 3 | ≥6 hPa: 1 · ≥10: 2 · ≥14: 3 |
| Humidity | 2 | <30%: 1 · >80%: 2 |
| Temperature extreme | 2 | >30 °C or <5 °C: 2 |
| Temperature change (6h) | 2 | ≥5 °C: 1 · ≥8 °C: 2 |
| Wind speed | 2 | ≥35 km/h: 1 · ≥50 km/h: 2 |
| UV index | 2 | ≥6: 1 · ≥8: 2 |
| Thunderstorm | 2 | Forecast: 1 · Active/within 3h: 2 |
| Air quality (AQI) | 3 | 51–100: 1 · 101–150: 2 · 151+: 3 |
| **Total** | **22** | |

**Risk levels:** Low (0–3) · Moderate (4–7) · High (8–11) · Very High (12+). The gauge maximum reflects only the factors you actually configure. All thresholds above are the defaults — see [Calibrating to Your Personal Triggers](#calibrating-to-your-personal-triggers).

## Troubleshooting

**Card looks out of date — old language/values, `…°C` says "cloudy", pressure reads ~980 as a "change".** These are the fingerprints of an **older version loading alongside the new one**. Open the console (F12): if you see **two** `Migraine Risk Card` banners, you have a duplicate resource.
- Go to **Settings → Dashboards → ⋮ → Resources** (enable *Advanced Mode* in your profile if the menu is hidden).
- Keep the HACS-managed entry — its URL ends in `?hacstag=…` (the tag busts the cache on every update). **Delete** any duplicate `migraine-risk-card.js` **without** a `hacstag`, and remove any stray `/config/www/…migraine…` file that isn't under `www/community/migraine-risk-card/`.
- **Ctrl+F5.** You should now see a single banner.

**A pressure/temperature-change tile shows `…` and never resolves.** The source entity is excluded from the recorder. Remove it from `recorder:` `exclude:`, or give the factor a sensor that is recorded.

**AQI shows `0 AQI`.** No air-quality source is configured. Add a WAQI (or similar) integration via **Settings → Devices & Services → Add Integration** (it needs an aqicn.org token, added through the UI — the old YAML `waqi:` platform was removed), then set `entity_air_quality`. Or omit the option to hide the tile.

**A factor shows `?`.** The configured entity ID doesn't exist — check for a typo or a renamed entity.

**Translations folder not being downloaded during update from 3.1.1 to 3.2.1.** Reinstall the card.
- Go to HACS, delete the card.
- Delete custom repository.
- Refresh HACS.
- Add custom repository.
- Install latest build of the card.

## Scientific Background

Several environmental factors are associated with migraine onset:

- **Barometric pressure drops** are the most-studied trigger; a 5–10 hPa fall over 6–24 h correlates with increased frequency (Kimoto et al., 2011; Okuma et al., 2015).
- **High humidity** and **temperature extremes** are linked to onset (Hoffmann et al., 2015).
- **Rapid temperature change** can drive vasodilation/constriction cycles.
- **Thunderstorms** bring sharp pressure changes and increased sferics.
- **Poor air quality** (PM2.5, ozone) correlates with higher headache prevalence (Szyszkowicz et al., 2009).

The card aggregates these into a single actionable score so you can act before symptoms start.

> This card is an informational aid, not a medical device. It doesn't diagnose or predict migraines and shouldn't replace professional medical advice.

## Development

The card source is [`src/migraine-risk-card.js`](src/migraine-risk-card.js); [`dist/`](dist/) is the shipped copy (no bundler — a straight copy of `src/`). To release: edit `src/`, bump `CARD_VERSION`, copy to `dist/`, commit, and tag. CI (`.github/workflows/validate.yml`) runs HACS validation and checks that `dist/` matches `src/`; `release.yml` attaches the card and sensor package to each published release.

Feel free to submit PR with translations. Just pick en.json, translate it and send PR with new language.

Project was made using Claude AI.

> Keep `CARD_VERSION` in step with the release tag — the console banner and the HACS version should agree.

## Licence

MIT Licence — see [LICENCE](LICENSE) for details.

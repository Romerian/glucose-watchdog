# Glucose Watchdog

A responsive glucose-monitoring dashboard constructed from the requirements connected to Jama item `MDSW-EpicSU-1` in project 62.

## Jama traceability

- `MDSW-EpicSU-1` — Construct the base app
- `MDSW-SR-17` — Separate UI, business, and data layers
- `MDSW-SOFTW-10` — Keep the application title in the upper-left corner
- `MDSW-SR-15` — Use the title “Glucose Watchdog” with an English bulldog icon
- `MDSW-EpicSU-2` — Refine the glucose graph with threshold colors, 24-hour pages, seven-day navigation, connected readings, and hover details
- `MDSW-EpicSU-3` — Record glucose entries and show blocking low/high warnings with acknowledgement, five-minute reminders, and warning history

## Architecture

- UI layer: `app/page.tsx` and `app/globals.css`
- Business layer: `lib/glucose-business.ts`
- Data layer: `lib/glucose-data.ts`

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate

```bash
npm run lint
npm run build
```

The readings in this base application are representative sample data and are not intended for clinical decision-making.

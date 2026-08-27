# Shutdown Tracker XML Round-Trip Lab

This repository is now a deliberately small browser-local laboratory for proving Microsoft Project XML progress behaviour.

The previous application architecture, backend, database, approval lifecycle, Mobile app, simulation framework, and extensive product governance were removed from the active tree. Their history remains available in Git and on `archive/pre-roundtrip-lab-reset-2026-08-27`.

## Current workflow

```text
Microsoft Project XML
        ↓
Import locally in the browser
        ↓
Review executable leaf tasks
        ↓
Record execution intent
Start / Pause / Resume / Finish / observed progress
        ↓
Use optional trial helpers
Mark on Track / progress to shift end / skip to planned finish
        ↓
Select an experimental export profile
        ↓
Download a separate candidate XML
        ↓
Open, recalculate and Save As XML in Microsoft Project
        ↓
Import the Project-saved result
        ↓
Compare source → intent → candidate → Project result
```

No file is uploaded. State is held in browser memory and is lost on reload.

## Export profiles

### Intent log only

The downloaded XML is byte-for-byte identical to the imported source. A separate JSON file records execution intent. Use this for baseline open/save comparisons.

### Task scalar diagnostic

Applies only task-level `PercentComplete`, `ActualStart`, and `ActualFinish` values to a complete-source candidate. This profile is deliberately retained as a **diagnostic known to be insufficient for assigned tasks**. It exists so native Project behaviour can be compared against the previously failed mechanism.

No profile is currently claimed to implement a complete native Microsoft Project progress transaction.

## Trial helpers

- **Mark on Track** records the intent to progress according to the planned window at the selected trial time. The displayed percentage is a simple wall-clock estimate, not a Microsoft Project calendar calculation.
- **Progress to expected shift end** records the estimated planned percentage at the configured shift end.
- **Skip to planned finish** moves the local trial time to the imported planned finish and records 100% expected progress.

These helpers accelerate user trials. They do not claim to reproduce the native Project commands until native evidence is captured and implemented as a separate profile.

## Run locally

```text
npm install
npm run check
npm test
npm run build
npm run serve
```

Then open the displayed local address.

## Repository boundary

The current task is feasibility, not product completion. Do not reintroduce the old architecture until assigned-task partial progress and completion have been proven through Microsoft Project-authored XML evidence.

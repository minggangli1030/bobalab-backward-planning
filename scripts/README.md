# Event export and analysis preparation

`export-events.js` reads the selected Firestore collection using application-default credentials. Set `GOOGLE_CLOUD_PROJECT` to an authorized project, then run `npm run export:events`. It writes `data/dump_events.json` and `.csv`; it does not modify database records. Do not run it against an original research project merely to test the portfolio.

`clean_events.py` transforms `data/dump_events.json` into task-level and participant-level CSV tables. Run from the repository root:

```bash
python3 scripts/clean_events.py --help
python3 scripts/clean_events.py
```

The cleaner uses only Python's standard library. It correlates help/task events, maps sessions to participant identifiers, separates practice, and reports timing and conditions. Outputs retain identifiers unless separately transformed; this is ETL, not anonymization. No participant data is included in this source cleanup.

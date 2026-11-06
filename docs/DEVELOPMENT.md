# Development

## Layout

- `src/`: active React application and browser-side services.
- `scripts/`: operator export and Python analysis preparation.
- `tests/`: offline Node tests using fictional task inputs.
- `archive/`: earlier Qualtrics versions and an unused chat-server experiment.
- Root `dump.js` and `clean-data.py`: compatibility entry points for older commands.

Install with `npm ci`; `package-lock.json` is the reproducibility anchor. Dependencies and `dist/` are generated locally and excluded from Git. The project uses Node 20+ for development/checks.

## Checks

`npm test` exercises seeded task reproducibility, difficulty boundaries, and practice dependency activation. `npm run build` checks frontend compilation. These checks do not validate live Firebase permissions, survey integration, every timer/flow transition, or real study outcomes.

The pre-cleanup linter reports existing errors across the active and historical source, including unused values and hook/dependency issues. `npm run lint` remains available; no lint pass is claimed and rules are not relaxed to make it green. CI runs the offline tests and build. A separate lint cleanup should precede claims of full static-analysis coverage.

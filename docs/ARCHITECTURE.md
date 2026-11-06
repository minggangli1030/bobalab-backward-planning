# Architecture and tradeoffs

## Application boundary

`src/main.jsx` mounts the experiment. `App.jsx` orchestrates landing/login, practice, allocation, task execution, semester transitions, and completion. Task components receive state and callbacks; `TaskRunnerLayout` provides the shared execution interface. UI state and effect handlers currently reside largely in a substantial root component, rather than in an extracted state-machine library.

## Task behavior

Counting, precision sliders, and typing create distinct interaction costs. Difficulty is tiered by level. `patternGenerator` provides an explicitly seeded generator for reproducible slider targets. This does not seed all application randomness: assistance error selection and dependency activation also use `Math.random()`.

## Persistence boundary

`sessionManager` stores sessions and handles browser continuity and abandonment. `eventTracker` enriches events with task/session/condition context and retries failed writes using an in-memory queue. The queue is not a durable delivery log: browser termination can lose queued events, and retry behavior does not establish exactly-once delivery. Daily limits and admin bypasses implemented in the client are not a trusted authorization boundary.

## Survey boundary

`qualtricsMessenger` uses `postMessage` to notify the embedding survey of semester/game completion. The legacy implementation uses a wildcard target origin and attempts same-origin parent DOM access. An authenticated production integration would require explicit origin validation and a documented message contract.

## Data pipeline

`scripts/export-events.js` uses application-default operator credentials to read Firestore events and exports them under ignored `data/`. `scripts/clean_events.py` maps events to sessions, task attempts, condition labels, assistance use, and timing features. The cleaner does not anonymize identifiers automatically; exports must be handled as participant data.

## Next engineering increments

Extract state transitions and scoring from the root component; add end-to-end flow tests; make event writes idempotent and the queue durable; introduce server-enforced access control; pin survey origins. These are follow-up opportunities, not implemented claims.

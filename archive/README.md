# Historical prototypes

`qualtrics/` preserves the progression from independent embedded tasks to an integrated interface and dependent-task variants. They depend on a Qualtrics runtime and are not imported by the active React application.

`chat-server.cjs` is an unused server-side LLM experiment. Its dependencies and legacy relative prompt paths are not configured by the current application. It is retained for provenance, not offered as a working production endpoint. The active browser assistance simulation lives in `src/components/ChatContainer.jsx`.

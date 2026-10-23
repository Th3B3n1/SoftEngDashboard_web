# Course Dashboard (web)

React SPA that rebuilds the Software Technology course dashboard from the student's own Moodle data (`edu.vik.bme.hu`).

```
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests
npm run build      # static bundle in dist/ (host anywhere)
```

## How it works
- **Login**: official Moodle Mobile SSO launch flow (works with EduID). The user pastes the `moodlemobile://token=…` redirect; only the web-service token is kept (localStorage). No server involved – Moodle allows CORS (`Access-Control-Allow-Origin: *`).
- **Data** (`src/moodle`): quizzes (best grade, attempts, completion), assignment submission/grading status, group membership (lab room, retake slot). Fetched in a few batched calls (`tool_mobile_call_external_functions`).
- **Engine** (`src/engine`, pure TS): turns the snapshot + static `src/rules/rules.json` into labs, tasks, XP, level, points, grade forecast.
- **Rules** are generated from the original dashboard's data: `python3 scripts/gen-rules.py ../probe/dash_data.json`.

## Scope
Moodle data (laborok, ellenőrző és előadás kvízek) és a Házi Feladat Portál API adatai (fázisok, mérföldkövek és achievementek) élőben, automatikusan szinkronizálódnak.

## Dev notes
- Inferred mappings: `recapQuizN` = N-th "Ellenőrző kvíz" by opening time; `lectureQuizN` = at least N completed "Előadás kvíz"; a "Pótlabor" retake is attached to the earliest failed lab before it; retake tokens used = retake groups joined/attempted.


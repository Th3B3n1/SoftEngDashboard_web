# Szoftvertechnológia (BMEVIMIAB04) — Course Dashboard (web)

Standalone, frontend-only React + TypeScript SPA that rebuilds the Software Engineering (`BMEVIMIAB04`) course progress dashboard directly in the browser from the student's own Moodle (`edu.vik.bme.hu`) and Homework Portal (`softeng-hw.ftsrg.org`) data—with **no backend server required**.

## Quick Start

```bash
npm install
npm run dev        # Start local dev server at http://localhost:5173
npm test           # Run Vitest unit tests
npm run build      # Type-check and build static bundle into dist/ (can be hosted anywhere)
npm run preview    # Preview production build locally
```

## How It Works

- **Authentication (`src/moodle/auth.ts`, `src/pages/Login.tsx`)**:
  - Uses the **manual token copy method** only (stored locally in `localStorage` as `moodle.token`).
  - Accepts either a raw 32-character hex token from Moodle's *Security keys* page (`https://edu.vik.bme.hu/user/managetoken.php` → *Moodle mobile web service*) or a `https://token=…` / `moodlemobile://token=…` redirect link copied from the official Moodle Mobile SSO launch page.
  - Validates the token immediately against `core_webservice_get_site_info` before logging in.

- **Direct Moodle Data Fetching (`src/moodle/client.ts`, `src/moodle/snapshot.ts`)**:
  - Calls `https://edu.vik.bme.hu/webservice/rest/server.php` directly from the browser using `application/x-www-form-urlencoded` (`POST` simple requests, supported natively by Moodle's `Access-Control-Allow-Origin: *` policy without CORS preflight).
  - Fetches user groups, quizzes (best grade, finished attempts, completion state), lab/retake assignments, activity completion statuses, and guest lecture attendance (`mod_attendance` via `tool_mobile_get_content` / `mobile_view_activity`) in batched requests (`tool_mobile_call_external_functions`).

- **Homework Portal Synchronization (`src/moodle/hfClient.ts`, `src/engine/hfIntegration.ts`)**:
  - Accessible via the 🔑 button in the top-right header (`src/components/HeaderActions.tsx`).
  - Supports pasting the Homework Portal LTI launch URL (`https://softeng-hw.ftsrg.org/?ltik=…`), a raw `ltik` token, or the raw course-instance JSON response.
  - Performs the two-step lookup (`/api/auth` → `/api/course-instances/softeng/{id}`) directly from the frontend (using Vite's `/hf-api` proxy during `npm run dev` or direct requests to `https://softeng-hw.ftsrg.org`) and caches the synced status in `localStorage`.

- **Dashboard Engine (`src/engine/`)**:
  - Pure TypeScript rules engine that combines the Moodle snapshot, Homework Portal status, and static course configuration (`src/rules/rules.json`, `src/rules/taskTexts.hu.json`, `src/rules/taskTexts.en.json`) to compute:
    - **Overview (`/`)**: Summary of signature status, current level & XP, upcoming tasks, and grade forecast.
    - **Signature (`/signature`)**: Lab attendance/quiz/report results, retake token usage, and homework phase timelines.
    - **Grade Outlook (`/grade`)**: Interactive level comparison slider, midterm & bonus points, and required exam percentages (including offered grade at Level 22).
    - **Semester Performance (`/levels`)**: Full level ladder, XP thresholds, rarity badges, and point carryover breakdown.
    - **Available Tasks (`/tasks`)**: Categorized task list with prerequisite unlock chains and reachable XP totals.

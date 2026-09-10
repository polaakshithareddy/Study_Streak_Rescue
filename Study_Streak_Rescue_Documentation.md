# Study Streak Rescue — Technical Documentation

**Gamified Academic Recovery & Dynamic Catch-Up Engine**
A full-stack MERN application that turns missed deadlines and study backlog into balanced, day-by-day recovery schedules, backed by a Microsoft Rewards–inspired incentives system.

Repository: `github.com/polaakshithareddy/Study_Streak_Rescue`
License: MIT

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature Summary](#2-feature-summary)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [System Architecture](#5-system-architecture)
6. [Data Models](#6-data-models)
7. [Core Algorithms](#7-core-algorithms)
   - [7.1 Catch-Up Engine](#71-catch-up-engine)
   - [7.2 Rewards Engine](#72-rewards-engine)
8. [API Reference](#8-api-reference)
   - [8.1 Auth](#81-auth-apiauth)
   - [8.2 Plans](#82-plans-apiplans)
   - [8.3 Tasks](#83-tasks-apitasks)
   - [8.4 Progress](#84-progress-apiprogress)
   - [8.5 Rewards](#85-rewards-apirewards)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Application Workflow](#10-application-workflow)
11. [Setup & Local Development](#11-setup--local-development)
12. [Environment Variables](#12-environment-variables)
13. [Testing](#13-testing)
14. [Production Deployment](#14-production-deployment)
15. [Security Notes](#15-security-notes)
16. [License](#16-license)

---

## 1. Overview

**Study Streak Rescue** solves a common student problem: falling behind on coursework and not having a realistic, motivating way to catch up. Rather than a static to-do list, the application:

- Algorithmically breaks down outstanding study topics into manageable daily chunks.
- Accounts for the student's busy schedule (classes, jobs, tutoring) and preserves rest days.
- Recalculates automatically whenever the student edits their schedule or falls further behind.
- Layers a full gamification system (points, streaks, monthly tiers, and a redeemable perks shop) on top of the recovery plan to sustain motivation.

The system is built as a MERN stack application (MongoDB, Express, React, Node.js) with a clear separation between the **Catch-Up Engine** (scheduling logic) and the **Rewards Engine** (motivation/gamification logic).

---

## 2. Feature Summary

| Feature | Description |
|---|---|
| **Algorithmic Catch-Up Engine** | Dynamically splits oversized study topics into 30–60 minute daily action items, respecting busy slots and reserving rest days. |
| **Rewards Dashboard (`/rewards`)** | Points balance, monthly scholar tiers (Starter → Focused → Elite), and an inline perks shop. |
| **3 Parallel Streaks** | Daily Task Streak, Full-Day Completion Streak, and App Review Check-In Streak, tracked independently. |
| **Multi-Subject Tracking** | Multiple active catch-up plans (e.g. Computer Science, Calculus, Physics) can run in parallel. |
| **Real-Time Deadline Alerts** | Background monitor fires a toast, an audio chime, and a browser desktop notification 15 minutes before a task deadline. |
| **Coffee Break Timer** | 15-minute guided relaxation countdown with pause/resume/reset and a finishing chime. |
| **Calendar Sync & Export** | `.ics` file export, Google Calendar deep-links, and PDF/Markdown export of the schedule. |
| **Modern Toast Notifications** | Animated success/error/warning/info banners replacing native browser alerts. |
| **Plan Regeneration** | Recalculates only the *incomplete* portion of a plan without discarding completed history. |

---

## 3. Technology Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| Styling | Tailwind CSS + vanilla CSS |
| Routing | react-router-dom v6 |
| Global State | `AuthContext` (JWT session) + `ToastContext` (notifications) |
| Data Visualization | Recharts (donut & bar charts) |
| Icons | Lucide React |
| HTTP Client | Axios |
| Date Handling | Day.js |
| Audio | Web Audio API (synthesized chimes, no audio files) |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js + Express 4 |
| Database | MongoDB via Mongoose 8, with automatic fallback to `mongodb-memory-server` if no local MongoDB is reachable |
| Authentication | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Validation | `express-validator` |
| Rate Limiting | `express-rate-limit` (separate limiters for auth vs. general API) |
| Date Calculation | Day.js (`isSameOrBefore` / `isSameOrAfter` plugins) |

---

## 4. Project Structure

```
Study_Streak_Rescue/
├── client/                        # React (Vite) frontend
│   ├── src/
│   │   ├── api/axios.js           # Configured Axios instance
│   │   ├── components/            # Reusable UI: Navbar, Card, Button, Badge,
│   │   │                          #   CelebrationModal, CoffeeBreakModal,
│   │   │                          #   PomodoroTimerModal, BusySlotsModal,
│   │   │                          #   DeadlineReminderMonitor, LoadingSpinner
│   │   ├── context/                # AuthContext, ToastContext
│   │   ├── pages/                  # AuthPage, NewPlanPage, PlanReviewPage,
│   │   │                          #   RegeneratePage, TodayPage, RewardsPage,
│   │   │                          #   RewardsHistoryPage, RewardsRedeemPage,
│   │   │                          #   ProgressPage, ProfilePage
│   │   └── utils/calendarSync.js   # .ics generation & Google Calendar links
│   ├── index.html / vite.config.js / tailwind.config.js
│   └── package.json
├── server/                        # Express backend
│   ├── controllers/                # authController, planController,
│   │                                #   taskController, progressController,
│   │                                #   rewardsController
│   ├── middleware/                 # auth.js (JWT), rateLimiter.js, validator.js
│   ├── models/                     # User, Plan, Task, RewardsProfile,
│   │                                #   PointsTransaction (Mongoose schemas)
│   ├── routes/                     # authRoutes, planRoutes, taskRoutes,
│   │                                #   progressRoutes, rewardsRoutes
│   ├── utils/
│   │   ├── catchUpEngine.js        # Scheduling algorithm
│   │   └── rewardsEngine.js        # Points / streaks / tiers logic
│   ├── tests/catchUpEngine.test.js # Node test-runner unit tests
│   ├── seed.js                     # Demo data seeding script
│   ├── index.js                    # App entry point, DB connection, routing
│   └── package.json
├── package.json                    # Root scripts (install:all, build, start)
└── render.yaml                     # Render.com deployment blueprint
```

---

## 5. System Architecture

```
┌─────────────────────────┐        ┌───────────────────────────────┐        ┌────────────────────────────┐
│   React 18 + Vite Client │◄──────►│   Express REST API             │◄──────►│   MongoDB (Mongoose)       │
│   (Tailwind, Recharts,   │  HTTPS │   /api/auth  /api/plans        │  ODM   │   auto-fallback to an      │
│   AuthContext/JWT,       │        │   /api/tasks /api/progress     │        │   in-memory MongoMemory-   │
│   ToastContext)          │        │   /api/rewards                 │        │   Server if no local Mongo │
└─────────────────────────┘        └───────────────────────────────┘        └────────────────────────────┘
```

- All API routes except `/api/auth/register` and `/api/auth/login` require a `Bearer` JWT, enforced by `authMiddleware`.
- A global `apiRateLimiter` (120 req/min per IP) protects `/api/*`; a stricter `authRateLimiter` (25 req/15 min) protects login/register specifically.
- In production (`NODE_ENV=production`), Express serves the built React bundle directly from `client/dist`, so the whole app runs as a **single Render web service**.
- A centralized Express error-handling middleware normalizes all thrown errors into `{ error: { message, code } }` JSON responses.

---

## 6. Data Models

### `User`
| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `email` | String | Required, unique, lowercased |
| `passwordHash` | String | bcrypt hash, never returned in API responses |
| `xp` | Number | Legacy XP counter (default `0`), incremented on task completion |
| `level` | Number | `floor(xp / 1000) + 1` |
| `createdAt` | Date | Default `Date.now` |

### `Plan`
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | Required |
| `title` | String | Required, e.g. "CS101 Data Structures Catch-Up" |
| `originalDeadline` | Date | The deadline the student originally missed |
| `targetDate` | Date | Required — new recovery deadline |
| `availableMinutesPerDay` | Number | Default `120` |
| `busySlots` | [BusySlot] | See below |
| `status` | String | `active` \| `completed` \| `abandoned` |
| `version` | Number | Incremented every regeneration |
| `createdAt` | Date | Default `Date.now` |

**BusySlot subdocument**: `dayOfWeek` (0=Sun–6=Sat), `startTime`/`endTime` ("HH:mm"), or a direct `blockedMinutes` value.

### `Task`
| Field | Type | Notes |
|---|---|---|
| `planId` | ObjectId → Plan | Required |
| `userId` | ObjectId → User | Required |
| `title` | String | Required |
| `estimatedMinutes` | Number | Default `30` |
| `category` | String | Default `"General"` |
| `scheduledDate` | String | `YYYY-MM-DD` |
| `status` | String | `pending` \| `done` \| `missed` |
| `completedAt` | Date \| null | Set when marked done |
| `originalTaskId` | String | Links sub-chunked tasks back to their source item |

### `RewardsProfile` (one per user)
| Field | Type | Notes |
|---|---|---|
| `totalPoints` / `pointsThisMonth` | Number | Lifetime vs. current-month totals |
| `currentTier` | String | `starter` \| `focused` \| `elite` |
| `tierMonth` | String | `YYYY-MM`, used to detect month rollover |
| `streaks.dailyTask` / `.fullDay` / `.checkIn` | `{current, best, lastDate}` | Three independent streak counters |
| `streakProtectionEnabled` / `streakProtectionUsedThisMonth` | Boolean | Streak Shield perk state |
| `punchCards` | [PunchCard] | Monthly mini-challenges (e.g. "5-Day Study Sprint") |
| `monthlyBonus` | `{targetPoints, targetActivities, activitiesDone, claimed}` | Consistency bonus (default target: 250 pts) |
| `bonusTilesCompleted` | [String] | IDs of completed daily bonus tiles |
| `unlockedPerks` | [String] | Perk IDs redeemed from the shop |
| `extraShields` | Number | Extra Streak Shields purchased |
| `activeTheme` | String | `light` \| `dark` |

### `PointsTransaction` (ledger)
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | Indexed |
| `amount` | Number | Positive = earned, negative = redeemed |
| `reason` | String enum | `task_complete`, `full_day_bonus`, `streak_bonus`, `monthly_bonus`, `plan_complete`, `bonus_tile`, `punch_card`, `check_in`, `redeemed` |
| `description` | String | Human-readable ledger line |
| `relatedTaskId` | ObjectId → Task \| null | Used to prevent double-awarding points, and to reverse points if a task is unchecked |
| `createdAt` | Date | Indexed, used for the 7-day/30-day points chart |

---

## 7. Core Algorithms

### 7.1 Catch-Up Engine

Implemented in `server/utils/catchUpEngine.js`, function `generateCatchUpPlan()`.

**Inputs:** `startDate`, `targetDate`, `availableMinutesPerDay`, `busySlots`, `tasks`, `isRegenerate`.

**Steps:**

1. **Filter tasks.** If regenerating, only tasks with `status !== 'done'` are kept.
2. **Build the day list.** Every calendar day between `startDate` and `targetDate` (inclusive) becomes a day object. For each day, `getBlockedMinutesForDate()` sums any `busySlots` matching that day of week, and `usableMinutes = availableMinutesPerDay − blockedMinutes` (floored at 0).
3. **Sub-chunk oversized tasks.** If a task's `estimatedMinutes` exceeds the largest single-day capacity in the range, it's split into evenly-sized parts (`"Title (Part i/N)"`), each tagged `isSubChunk: true`.
4. **Reserve buffer/rest days.** The engine estimates how many days are actually required (`totalRequiredMinutes / availableMinutesPerDay`). If there's slack (more usable days than needed) and at least 3 usable days exist, it reserves up to `floor(usableDays / 4)` buffer days — picked near the 70%-through point of the schedule — and excludes them from task assignment.
5. **Distribute tasks round-robin.** Tasks are walked in order and assigned to the current active day if it has capacity (or is still empty); otherwise the engine advances to the next active day. A day index rotates after every assignment to spread work evenly. Any task that still can't fit cleanly is placed on the day with the least allocated time so far (fallback).
6. **Overflow check.** If any day's final allocated minutes exceed the stated `availableMinutesPerDay`, a `warning` string is returned suggesting the student extend the target date.
7. **Output.** A `schedule` array (`{date, dayOfWeek, usableMinutes, allocatedMinutes, isBufferDay, tasks}` per day) plus a `summary` (`totalDays, usableDays, bufferDaysCount, totalScheduledMinutes, averageMinutesPerDay, tasksScheduledCount`).

This same function powers three flows: the **initial plan preview** (`POST /api/plans`), **full regeneration** (`POST /api/plans/:id/regenerate`), and **busy-slot edits** (`PUT /api/plans/:id/busy-slots`) — always operating only on the tasks that are still incomplete.

### 7.2 Rewards Engine

Implemented in `server/utils/rewardsEngine.js`.

**Point sources** (each recorded as an immutable `PointsTransaction`):

| Event | Points |
|---|---|
| Completing any task | +10 |
| Clearing every task scheduled for the day | +15 |
| Maintaining the Daily Task Streak (once/day) | +5 |
| Completing a daily bonus tile (notes review, desk prep) | +5 |
| Completing a punch card (e.g. "5-Day Study Sprint") | +50 to +100 |
| Monthly Consistency Bonus (pointsThisMonth ≥ target *and* streak ≥ 3) | +50 (Starter) / +100 (Focused) / +150 (Elite) |
| Daily App Check-In | +5 |

**Idempotency:** before awarding task-completion points, the engine checks for an existing `task_complete` transaction tied to that `relatedTaskId`; if points were already given, no duplicate award occurs. Unchecking a task (`revokeTaskCompletionRewards`) finds and deletes all transactions tied to that task and deducts the total from both `totalPoints` and `pointsThisMonth`.

**Streak logic** (per streak type — Daily Task, Full-Day, Check-In):
- If the last recorded date was *yesterday*, the streak increments.
- If the last recorded date was *today already*, nothing changes (no double counting).
- Otherwise the streak would normally reset to 1 — **unless** `streakProtectionEnabled` is on and hasn't been used this month, in which case the streak is preserved and the protection is marked as used for the month.
- `best` is updated to `max(current, best)` on every change.

**Monthly tiers** (`calculateTier(pointsThisMonth)`):

| Tier | Threshold (points this month) |
|---|---|
| Starter | 0–249 |
| Focused | 250–499 |
| Elite | 500+ |

Tiers, `pointsThisMonth`, punch cards, and the monthly consistency bonus all reset automatically the first time a user is active in a new calendar month (`tierMonth !== currentMonthStr`).

**Perks Shop** (redeemed via `POST /api/rewards/redeem`, cost enforced against `totalPoints`):

| Perk | Cost | Effect |
|---|---|---|
| Coffee Break Treat | 100 pts | Unlocks the 15-minute relaxation timer modal |
| Gold Scholar Badge | 150 pts | Cosmetic profile badge |
| Midnight Focus Theme | 200 pts | Sets `activeTheme = 'dark'` |
| Extra Streak Shield | 250 pts | Increments `extraShields` and force-enables `streakProtectionEnabled` |

---

## 8. API Reference

All endpoints are prefixed with `/api`. Except where noted, every route requires header:
`Authorization: Bearer <jwt>`

Errors are always returned as:
```json
{ "error": { "message": "string", "code": "STRING_CODE" } }
```

### 8.1 Auth (`/api/auth`)

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/register` | No | `{ name, email, password }` | Creates a user, returns `{ token, user }`. Rate-limited. |
| POST | `/login` | No | `{ email, password }` | Verifies credentials, returns `{ token, user }`. Rate-limited. |
| GET | `/me` | Yes | — | Returns the current user (excluding `passwordHash`). |
| POST | `/seed-demo` | Yes | — | Wipes the user's plans/tasks and inserts a realistic demo catch-up plan (CS101 example) for testing/demoing the UI. |

### 8.2 Plans (`/api/plans`)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/` | `{ title, originalDeadline?, targetDate, availableMinutesPerDay?, busySlots?, tasks[] }` | Runs the Catch-Up Engine and returns a **preview** schedule — nothing is persisted yet. |
| POST | `/confirm` or `/:id/confirm` | `{ title, originalDeadline?, targetDate, availableMinutesPerDay, busySlots, schedule[] }` | Persists the plan and creates `Task` documents from the confirmed schedule. Previous active plans are **not** abandoned (supports multi-subject tracking). |
| GET | `/active` | Query: `?planId=` (optional) | Returns all active plans, the selected plan (defaults to most recent), its tasks, tasks across *all* active plans, today's tasks, and a missed-task count. Automatically flips any stale `pending` tasks to `missed`. |
| POST | `/:id/regenerate` | `{ confirm?, newAvailableMinutesPerDay?, newTargetDate? }` | Re-runs the engine on incomplete tasks only. `confirm=false` (default) returns a preview; `confirm=true` deletes old incomplete tasks, inserts the new schedule, and bumps `plan.version`. |
| PUT | `/:id/busy-slots` | `{ busySlots[] }` | Updates busy slots on a plan and automatically re-runs the engine to reschedule all incomplete tasks around the new constraints. |

### 8.3 Tasks (`/api/tasks`)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/today` | — | Returns today's tasks across all active plans (auto-marks overdue `pending` tasks as `missed` first). |
| PATCH | `/:id/complete` | `{ done: true \| false }` | Toggles completion. On completion: awards XP (+100, +500 if the whole day is cleared) and triggers the Rewards Engine (`processTaskCompletionRewards`). On un-completion: reverses XP and reward points via `revokeTaskCompletionRewards`. Returns `{ task, isDayCleared, xpEarned, userXp, userLevel }`. |
| PATCH | `/:id/miss` | — | Manually marks a task as `missed`. |

### 8.4 Progress (`/api/progress`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Returns overall stats for the active (or most recent) plan: `currentStreak`, `longestStreak` (computed from distinct completed dates), task counts by status, `completionPercentage`, a 7-day `weeklyChartData` series (completed/missed/pending per day), and a `badges` array (`First Step`, `3-Day Streak`, `7-Day Warrior`, `Plan Saved`, `100% Master`) with `unlocked` booleans. |

### 8.5 Rewards (`/api/rewards`)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/summary` | — | Auto-records today's app check-in, then returns `totalPoints`, `pointsThisMonth`, `pointsEarnedToday`, `currentTier`, `nextTierTarget`, `tierProgressPct`, all three `streaks`, streak-protection state, `extraShields`, `activeTheme`, `monthlyBonus`, and `unlockedPerks`. |
| GET | `/today-set` | — | Returns today's task tiles (10 pts each) plus 2 fixed bonus activity tiles (5 pts each: "Review yesterday's notes", "Organize study desk"). |
| POST | `/complete-bonus-tile` | `{ tileId }` | Awards +5 pts for a bonus tile (once per day per tile). |
| GET | `/punch-cards` | — | Returns the user's current monthly punch cards and fill progress. |
| POST | `/streak-protection` | `{ enabled: true \| false }` | Toggles whether a Streak Shield auto-applies to save a broken streak. |
| GET | `/history` | Query: `?range=week\|month` | Returns raw `PointsTransaction` history plus a day-by-day `chartData` series (7 or 30 days) for the points bar chart. |
| POST | `/redeem` | `{ perkId, perkTitle, cost }` | Deducts `cost` from `totalPoints` (rejects if insufficient), applies perk-specific side effects (`perk_focus_theme` → dark theme; `perk_streak_shield` → +1 shield & protection enabled), and logs a `redeemed` transaction. |

---

## 9. Frontend Architecture

### Pages (`client/src/pages`)
| Page | Route (typical) | Purpose |
|---|---|---|
| `AuthPage.jsx` | `/auth` | Login & registration forms |
| `NewPlanPage.jsx` | `/plan/new` | Catch-up plan generator + busy-slots selector |
| `PlanReviewPage.jsx` | `/plan/review` | Preview/confirm the generated schedule, calendar sync/export, busy-slot editing |
| `RegeneratePage.jsx` | `/plan/regenerate` | Dedicated flow for recalculating an existing plan |
| `TodayPage.jsx` | `/today` | Daily rescue hub: multi-subject checklist, Pomodoro timer, celebration modal |
| `RewardsPage.jsx` | `/rewards` | Points, tiers, streaks, punch cards, perks shop entry |
| `RewardsRedeemPage.jsx` | `/rewards/redeem` | Perk redemption flow |
| `RewardsHistoryPage.jsx` | `/rewards/history` | Points ledger + bar chart (7/30-day toggle) |
| `ProgressPage.jsx` | `/progress` | Velocity donut charts, weekly streak performance, badges |
| `ProfilePage.jsx` | `/profile` | User profile, level badges, account settings |

### Shared Components (`client/src/components`)
`Navbar`, `Card`, `Button`, `Badge`, `LoadingSpinner`, `CelebrationModal` (confetti + fanfare on task/day completion), `CoffeeBreakModal` (15-min relaxation timer), `PomodoroTimerModal` (25-min focus timer), `BusySlotsModal` (busy-slot editor), `DeadlineReminderMonitor` (background component mounted app-wide that polls for tasks within 15 minutes of deadline and fires the toast/chime/notification).

### Global State (`client/src/context`)
- **`AuthContext.jsx`** — stores the JWT and current user, exposes login/register/logout, attaches the token to Axios requests.
- **`ToastContext.jsx`** — global animated toast queue (success/error/warning/info) used app-wide in place of `window.alert()`.

### Utilities (`client/src/utils`)
- **`calendarSync.js`** — generates downloadable `.ics` files and Google Calendar deep-links from a plan's schedule.

---

## 10. Application Workflow

1. **Student falls behind** on a topic or misses a deadline.
2. **Create a plan** at `/plan/new` — supply a title, target recovery date, daily available minutes, busy slots, and the outstanding tasks.
3. The **Catch-Up Engine** chunks the workload into a balanced daily schedule (Section 7.1).
4. The student **previews and confirms** the plan at `/plan/review`; confirming persists the plan and creates `Task` documents.
5. Each day, the student works through the **Daily Checklist** at `/today`.
   - Completing a task awards points, updates all relevant streaks, and (if it's the last task of the day) triggers the Full-Day bonus and a celebration animation.
   - If a task's deadline is 15 minutes away, the background monitor fires a toast + chime + OS notification.
   - If the student edits busy slots or otherwise falls behind again, the plan can be **regenerated** without losing completed history.
6. Points accumulate on the **Rewards** dashboard, driving monthly tier progress (Starter → Focused → Elite) and streak growth.
7. Once enough points are earned, the student can **redeem perks** (Coffee Break, Gold Badge, Dark Theme, Streak Shield) from the inline shop.

---

## 11. Setup & Local Development

### Prerequisites
- Node.js v18+
- npm v9+
- MongoDB (optional — the server automatically falls back to `mongodb-memory-server` if no local MongoDB instance is reachable)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/polaakshithareddy/Study_Streak_Rescue.git
cd Study_Streak_Rescue

# 2. Install all dependencies (root + server + client)
npm run install:all

# 3. Start the backend (port 5000)
cd server
npm run dev

# 4. In a separate terminal, start the frontend (port 3000)
cd client
npm run dev
```

Open `http://localhost:3000` in your browser.

### Optional: seed demo data
Once logged in, call `POST /api/auth/seed-demo` (or trigger it from the UI, if wired to a button) to populate a realistic sample catch-up plan for a CS101 course, including already-completed, missed, and upcoming tasks.

---

## 12. Environment Variables

| Variable | Where | Required | Default | Purpose |
|---|---|---|---|---|
| `PORT` | server | No | `5000` | Express server port |
| `MONGO_URI` | server | No | `mongodb://127.0.0.1:27017/study_streak_rescue` | MongoDB connection string; falls back to in-memory Mongo if unreachable |
| `JWT_SECRET` | server | Recommended | hardcoded fallback string | Secret used to sign/verify JWTs — **must** be overridden in production |
| `NODE_ENV` | server | No | — | Set to `production` to serve the built React app from Express and enable the SPA fallback route |

---

## 13. Testing

The backend ships a Node.js native test-runner suite for the scheduling algorithm:

```bash
cd server
npm test
# runs: node --test tests/catchUpEngine.test.js
```

`tests/catchUpEngine.test.js` exercises `generateCatchUpPlan()` directly — covering busy-slot blocking, task sub-chunking for oversized topics, buffer/rest-day reservation, and regeneration filtering (only incomplete tasks are rescheduled).

---

## 14. Production Deployment

The app is designed to deploy as a **single Render.com Web Service** (see `render.yaml`):

1. Push the repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. **Build command:** `npm run install:all && npm run build`
4. **Start command:** `npm start`
5. Environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET=<a secure random value>`
   - `MONGO_URI=<your MongoDB connection string>` (e.g. MongoDB Atlas)

Render builds the Vite React bundle and Express then serves it directly (`server/index.js` serves `client/dist` and falls back to `index.html` for client-side routing) — no separate static hosting is needed.

---

## 15. Security Notes

- Passwords are hashed with `bcryptjs` before storage; raw passwords are never persisted or logged.
- JWTs are short-lived per session (7-day expiry) and required on every route except registration/login.
- `express-rate-limit` mitigates brute-force login attempts (25 requests / 15 min) and general API abuse (120 requests / min).
- `express-validator` enforces input schemas (valid email, minimum password length, required fields) before requests reach controller logic.
- The default `JWT_SECRET` in `middleware/auth.js` is a development fallback only — **always set a strong `JWT_SECRET` environment variable in production.**

---

## 16. License

This project is licensed under the **MIT License**.

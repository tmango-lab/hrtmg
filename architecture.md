# 🏗️ Payroll System Architecture
**Path:** `c:\Users\Tmango\Desktop\เงินเดือน`

## 1. Core Components

The payroll system consists of three primary components that share business logic:
1. **Dynamic Frontend SPA** (`payroll_app.html`): The main calculation engine. Parses fingerprint CSVs, resolves shifts, calculates OT and late deductions, and allows manual overrides.
2. **Settings Configuration UI** (`payroll_settings.html`): The central "Master Control" interface where administrators configure global rules, employee shifts, OT policies, and rounding rules.
3. **Backend CLI Scripts** (`calc_salary.py`, `calc_salary.js`): Headless scripts used for terminal-based processing or validation (Legacy fallback).

## 2. Cloud Database & Authentication (Supabase)

The system is now fully cloud-native, hosted on **Netlify**, with state managed by **Supabase**. All data is automatically synchronized across devices.
- **Authentication**: Access is gated via Supabase Auth (Email/Password). Unauthorized users are redirected to `login.html`.
- **system_settings**: Replaces `PAYROLL_SAVED_RULES_V1`. Contains global rules, shift templates, and department OT configurations.
- **employees**: Centralized employee directory.
- **time_punches**: Persists raw CSV uploads. Unique by `(employee_id, punch_date)`.
- **manual_edits**: Tracks manual administrative overrides (notes, custom amounts, shop closed toggles).
- **advances & errands**: Tracks advance salary requests and short leaves/errands. 

## 3. Data Flow & Execution Pipeline

```mermaid
flowchart TD
    %% Define Nodes
    Login[🔒 login.html\nSupabase Auth]
    Settings[⚙️ payroll_settings.html\nMaster Control UI]
    Supabase[(☁️ Supabase PostgreSQL\n6 Tables + RLS)]
    App[🧮 payroll_app.html\nCalculation Engine]
    CSV[📄 Fingerprint CSV Upload]
    
    %% Internal App Nodes
    InitApp[🔄 initApp()\nAsync Cloud Fetch]
    State[🧠 Internal State\nSHIFT, DEPT_RULES, GLOBAL_RULES]
    Logic[⚙️ Shift & Rate Logic\nLate deductions, OT, Overrides]

    %% Data Flow
    Login -- "Validates User" --> Supabase
    Settings -- "User clicks Save\n(saveToSupabase)" --> Supabase
    App -- "Page Load" --> InitApp
    InitApp -- "Fetches Settings & Punches" --> Supabase
    Supabase -- "Returns Data" --> State
    
    CSV -- "parseCSV() & Upsert" --> Supabase
    State -- "Applies Rules" --> Logic
    Logic -- "Calculates Net Pay" --> App
```

1. **Authentication Check**: Both `payroll_app.html` and `payroll_settings.html` invoke `requireAuth()` to ensure a valid Supabase session exists.
2. **Configuration Sync (Page Load)**: `initApp()` runs in `payroll_app.html`. It fetches data concurrently from Supabase (`system_settings`, `employees`, `time_punches`, etc.) and injects them into memory states (`SHIFT`, `GLOBAL_RULES`, `RAW_PUNCHES`, `EDITS`).
3. **Import Stage**: User selects a CSV file. The SPA uses dual-encoding detection to parse punch records, updates memory, and immediately asynchronously upserts to `time_punches` via `saveRawPunchesToCloud()`.
4. **Shift Resolution Stage**: `getShift()` evaluates dynamic OT group upgrades based on the employee's `detectedShift` compared against their configured baseline from the cloud.
5. **Rate & Deduction Logic**: Evaluates Grace period rules, calculates `r.deduct`, and handles special overrides (such as `forceOverride` for Cleaners working on Sundays). 
6. **Background Synchronization**: Features like `cellEdit`, `timeEdit`, and Advance/Errand additions immediately update the UI via partial DOM rendering and trigger asynchronous background upserts (`saveEditsToCloud()`, etc.) to Supabase without blocking the UI.
7. **Legacy Feature Deprecation**: Legacy functionalities like manual JSON Backups, Restore buttons, and data Resets have been completely removed from the UI, as the system now relies entirely on real-time Cloud Synchronization via Supabase. Additionally, the local JSON export feature (`skill.md`) was deprecated from the settings panel since all configurations are directly managed in the cloud.

## 4. UI Architecture
- **Zero-Dependency Core**: Vanilla HTML/CSS/JS with the Supabase JS v2 client as the only external SDK.
- **Consistent Grid & Fixed Layouts**: The UI enforces visual consistency across dynamic elements. Employee cards utilize CSS Grid (`grid-template-columns`) for perfectly aligning header action buttons (Advance, Errand, Calendar), while the internal data tables employ `table-layout: fixed` with precise `<colgroup>` percentages to guarantee identical column widths across all employees regardless of content length.
- **Enhanced Note & Badge System**: The "หมายเหตุระบบ / แอดมิน" (System/Admin Note) column features an expanded, right-aligned `<input>` element for improved usability, alongside dynamic, color-coded system badges (`sys-note-badge`) for clear status visibility (e.g., Shop Closed, Off Day).
- **Partial DOM Rendering & State Preservation**: Core changes via `timeEdit`, `cellEdit`, and `resetRow` trigger `calculateAllData(true)` to recompute payroll math universally, but bypass the recursive `renderAll()` process. A dedicated `updateChipsUI()` function precisely targets and updates specific header and table summary components (`#hchips-EID`, `#chips-EID`). This localized `innerHTML/outerHTML` manipulation applies diffs only to the targets, preventing UX friction such as open accordions collapsing post-edit.
- **Master Control Panel**: `payroll_settings.html` provides a user-friendly interface to build the cloud configuration structures.
- **Minimalist Professional Aesthetic**: The UI was refined by systematically stripping out emojis and redundant visual clutter across all screens (`payroll_app.html`, `payroll_settings.html`, etc.), opting for a clean, professional typography-led design.

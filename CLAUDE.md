# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Edunexify** — the **web (browser) frontend** of a multi-tenant SaaS school management platform. Angular 19 SSR app served at `https://edunexify.co.in`. This repo is the website counterpart to `EduPay-Leave-android` (the mobile/Capacitor app). Both frontends share the same Spring Boot backend.

Backend: `/Applications/IAS/ias-management(backend)`
Android app: `/Applications/IAS/EduPay-Leave-android`
Prod URL: `https://edunexify.co.in`

---

## Commands

```bash
npm start                                         # Dev server (ng serve)
ng build                                          # Production build (SSR)
ng build --watch --configuration development      # Dev build with watch
ng test                                           # Karma/Jasmine unit tests
node dist/ias/server/server.mjs                   # Serve SSR production build
```

---

## Architecture

**Angular 19 standalone components** — no NgModules. Every component declares its own `imports: []`. Bootstrapped via `bootstrapApplication()` in `main.ts`.

### Routing

Single protected parent route `/dashboard` guarded by `authGuard`. All feature routes are lazy-loaded children. Public routes: `/home`, `/reset-password`. Route access restricted by `roleGuard` via `data: { roles: [...] }`.

**Role-to-route map:**
- `STUDENT` — fees, payment-history, apply-leave, student-attendance, student-dashboard, my-results, report-card, timetable, notice, event-calendar, student-details (own), fee-structure (view)
- `TEACHER` — teacher-attendance, student-list, view-leaves, mark-entry, class-results, report-card, teacher-dashboard, timetable, notice, event-calendar, event-new/edit
- `ADMIN` — everything TEACHER has + register, bulk-import, teacher-bulk-import, teacher-list, fee-structure (edit), bus-fees, fee-reminders, payment-history-admin, student-promotion, exam-config, subject-config, student-stream, audit-logs, analytics, admin-dashboard, school-settings, class-management, admin-list, admin-details
- `SUB_ADMIN` — class-management, timetable
- `SUPER_ADMIN` — super-admin-dashboard, admin-list, admin-details, register-admin

### Authentication

Custom JWT auth. Tokens stored in `localStorage` (`accessToken`, `refreshToken`).

- `auth.service.ts` — login, logout, refresh, password reset; decodes JWT via `jwtDecode()` to extract `role` and `userId`
- `auth.guard.ts` — validates JWT `exp` on every `/dashboard` navigation; clears storage and redirects to `/home` on invalid token
- `auth.interceptor.ts` — injects `Bearer` header; retries once after 401 via refresh; excludes `/login`, `/refresh-token`, `/request-password-reset`, `/reset-password`
- `auth-state.service.ts` — holds in-memory `UserInfo { userId, role, name, className }`

**Roles:** `STUDENT`, `TEACHER`, `ADMIN`, `SUB_ADMIN`, `SUPER_ADMIN`

### API Communication

Base URL from `src/environments/environment.ts`:
- Dev: `http://localhost:8080/api`
- Prod: `/api` (same-origin — Angular and backend served together)

Paginated responses: `{ content: T[], totalElements, totalPages, number, size, first, last, empty }`. Build paginated requests with `HttpParams`.

Some endpoints return plain text — use `responseType: 'text'`.

### State Management

No NgRx. Services are `providedIn: 'root'` singletons.

**Standard cleanup pattern (required in all components with subscriptions):**
```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.getData().pipe(takeUntil(this.destroy$)).subscribe(...);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

All one-off subscriptions (e.g. delete, save) must also use `pipe(takeUntil(this.destroy$))`.

### UI & Dialogs

Angular Material. User feedback and confirmations are handled **exclusively** via `ToastService` — **never use SweetAlert2 (Swal) directly**.

- `ToastService` (`src/app/services/toast.service.ts`) — wraps a `BehaviorSubject<Toast[]>` for toast banners + `MatDialog` for confirm dialogs
  - `toast.success/error/warning/info(title, message?)` — shows a toast banner
  - `toast.confirm(data: ConfirmDialogData): Promise<boolean>` — opens `ConfirmDialogComponent` via MatDialog
- `ToastContainerComponent` (`src/app/components/toast/toast-container.component.ts`) — renders the toast stack; mounted in `app.component.html`
- `ConfirmDialogComponent` (`src/app/components/confirm-dialog/`) — the MatDialog modal for confirmations/alerts

`MatDialog` is also used for `WelcomeDialogComponent` (shown once on first dashboard load via `localStorage` flag).

### Forms

Reactive forms (`ReactiveFormsModule`, `FormBuilder`) for complex forms. Template-driven (`FormsModule`) for simpler ones.

---

## Features

### Fee Management
- `fees.component.ts` — per-student fee tracker; STUDENT sees own fees, ADMIN navigates via `:studentId`
- `fee-structure.component.ts` — admin edits class-wise fee structure per academic year; always uses PUT
- `bus-fees.component.ts` — admin edits distance-based bus fee slabs; same session pattern
- `payment.component.ts` — Razorpay integration; script lazy-loaded
- `payment-history.component.ts` / `payment-history-admin.component.ts` — paginated payment history
- `fee-reminders.component.ts` — admin sends push notification reminders to fee defaulters

### Attendance
- `teacher-attendance.component.ts` — teacher/admin marks daily attendance; uses `switchMap` pipeline
- `student-attendance.component.ts` — student/admin views attendance summary

### Leave Management
- `apply-leave.component.ts` — student applies for leave
- `view-leaves.component.ts` — teacher/admin views and approves/rejects leaves; paginated

### Marks & Results
- `subject-config.component.ts`, `exam-config.component.ts`, `student-stream.component.ts`
- `mark-entry.component.ts`, `student-results.component.ts`, `class-results.component.ts`, `report-card.component.ts`

### People Management
- `register.component.ts` — admin registers student or teacher
- `bulk-import.component.ts` / `teacher-bulk-import.component.ts` — CSV bulk import
- `student-promotion.component.ts` — promotes students to next class
- `student-list.component.ts`, `teacher-list.component.ts`
- `student-details.component.ts`, `teacher-details.component.ts`, `admin-details.component.ts`

### Notifications & Communication
- `notice.component.ts`, `view-notification.component.ts`
- `event-calendar.component.ts` / `event-form.component.ts`

### School Configuration
- `school-settings.component.ts`, `class-management.component.ts`, `timetable.component.ts`

### Admin & Super Admin
- `admin-dashboard.component.ts`, `super-admin-dashboard.component.ts`
- `analytics.component.ts` — charts/stats (ng2-charts / Chart.js)
- `audit-logs.component.ts` — paginated audit log viewer
- `admin-list.component.ts`, `register-admin.component.ts`

---

## Key Differences vs Android App

| Topic | Website (this repo) | Android (`EduPay-Leave-android`) |
|---|---|---|
| API URL (dev) | `http://localhost:8080/api` | `https://edunexify.co.in/api` |
| API URL (prod) | `/api` (same-origin) | `https://edunexify.co.in/api` |
| Routing | Eager imports in `app.routes.ts` | Lazy `loadComponent()` in `app.routes.ts` |
| Change detection | Mix of Default and OnPush | OnPush everywhere |
| Capacitor / native | No | Yes — Capacitor wraps it as Android APK |
| Push notifications | No | Yes — `PushNotifications` Capacitor plugin |
| SelectMonthDialog | No | Yes — `ToastService.selectMonth()` |
| Skeleton loaders | Partial | Yes — `sk-shimmer` class used throughout |

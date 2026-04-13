# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Dev server (ng serve)
ng build               # Production build
ng build --watch --configuration development  # Dev build with watch
ng test                # Karma/Jasmine unit tests
node dist/ias/server/server.mjs  # Serve SSR production build
```

## Architecture

**Angular 19 standalone components** — no NgModules. Every component declares its own `imports: []`. Bootstrapped via `bootstrapApplication()` in `main.ts`.

### Routing

Single protected parent route `/dashboard` guarded by `AuthGuard`. All feature routes are children of `/dashboard`. Public routes: `/home`, `/reset-password`. Dynamic segments like `:studentId`, `:teacherId`, `:paymentId` are common.

### Authentication

Custom JWT auth (not Keycloak, despite the dependency). Tokens stored in `localStorage` (`accessToken`, `refreshToken`).

- `auth.service.ts` — login, logout, refresh, password reset; decodes JWT via `jwtDecode()` to extract `role` and `userId`
- `auth.guard.ts` — validates JWT `exp` claim on every `/dashboard` navigation; clears storage and redirects to `/home` on invalid token
- `auth.interceptor.ts` — injects `Bearer` header; automatically retries failed requests after 401 by calling the refresh endpoint; excludes `/login`, `/refresh-token`, `/request-password-reset`, `/reset-password`

**Roles in JWT claims:** `STUDENT`, `TEACHER`, `ADMIN`, `SUB_ADMIN`, `SUPER_ADMIN` — used in components for conditional rendering.

### API Communication

Base URL from `src/environments/environment.ts`:
- Dev: `http://localhost:8080/api`
- Prod: `https://api.indraacademy.in/api`

Paginated responses follow the pattern `{ content: T[], totalElements, totalPages, number, size, first, last, empty }`. Build paginated requests with `HttpParams` (see `leave.service.ts` as reference).

Some endpoints return plain text; use `responseType: 'text'` for those.

### State Management

No NgRx or external state library. Services are `providedIn: 'root'` singletons. Components subscribe to service Observables and store results in local properties.

**Standard cleanup pattern** (required in all components with subscriptions):
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

### Payment Integration

Razorpay is loaded as a global script and declared as `declare var Razorpay: any`. The public key is fetched from the backend (not hardcoded in the frontend). See `razorpay.service.ts` and `payment/` component.

### UI

Angular Material + ngx-bootstrap. User feedback via SweetAlert2 (`Swal`). Dialogs use `MatDialog` (e.g., `WelcomeDialogComponent` shown once on first dashboard load, tracked via `localStorage`).

### Forms

Mixed approach — reactive forms (`ReactiveFormsModule`, `FormBuilder`) for complex forms like leave application; template-driven (`FormsModule`, `ngForm`) for simpler ones.

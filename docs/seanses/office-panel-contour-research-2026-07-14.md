# Research (Perplexity) — office-panel-contour, 2026-07-14

> Подготовка консилиума office-panel-contour: panel.mmbrn.tech (решение владельца 2026-07-14).

## Q1-landscape — Отдельная операторская панель vs расширение существующего кабинета

**Запрос:** In 2025-2026, for a small team running a NestJS backend (stateless, no DB) plus an existing React+Vite user cabinet with its own Postgres-backed auth, what are established patterns and tradeoffs for adding an internal operator/status panel on a separate subdomain: (a) new standalone SPA app vs (b) role-gated section inside the existing cabinet vs (c) server-rendered minimal pages? Focus on maintenance cost, auth reuse, deployment simplicity (single VPS with Caddy), and when teams regret each choice.

**Выжимка:**

For a small team in 2025–2026 with a stateless NestJS backend and an existing React+Vite cabinet, the **established pattern is (b) a role-gated section inside the existing cabinet**, provided the operator panel’s interactions are highly interactive (dashboards, real-time status). This approach minimizes maintenance by reusing your existing auth, build pipeline, and deployment config, avoiding the overhead of a second app or the UX friction of server-rendered pages.

### Tradeoff Analysis

| Factor | (a) New Standalone SPA | (b) Role-Gated Section (Existing Cabinet) | (c) Server-Rendered Minimal Pages |
| :--- | :--- | :--- | : |
| **Maintenance Cost** | **High:** Duplicate build configs, CI/CD pipelines, and dependency management [4][13]. | **Low:** Single codebase, shared `tsconfig`, and unified dependency updates [7][13]. | **Medium:** Requires managing static HTML generation and NestJS static serving logic, but no JS bundle maintenance [4][12]. |
| **Auth Reuse** | **Complex:** Requires cross-origin token handling or a separate auth provider; risk of CORS issues [4][8]. | **Trivial:** Direct reuse of existing Auth0/Postgres context and user state; no CORS [1][9]. | **Simple:** Auth via cookies/session; straightforward but less flexible for dynamic APIs [12]. |
| **Deployment Simplicity** | **Medium:** Two distinct builds; requires Caddy to route two subdomains or proxy rules [4]. | **Highest:** Single Docker container/build; Caddy routes a single path (`/admin`) [4]. | **High:** Single container using `@nestjs/serve-static` for HTML [4][6]. |
| **When Teams Regret It** | **Regret:** "Why do we maintain two `package.json`s and two CI pipelines for one feature?" [4]. | **Regret:** Only if the admin UI becomes massive (>50 complex components), causing UI bloat in the main app [12]. | **Regret:** If the panel needs real-time updates, complex forms, or heavy interactivity; SSR feels "static" and slow [12]. |

### Key Implementation Patterns

**1. Auth Reuse (Role-Gated Section)**
*   **Backend:** Use NestJS `@Roles()` decorator and a `RolesGuard` to restrict API endpoints for operator actions [3].
*   **Frontend:** Retrieve user roles/permissions on login and store them in global state (Context API, Redux, or React Query) [1].
*   **Routing:** Dynamically guard routes in React Router based on the user's role context; render menus conditionally [1].
*   **Sync:** If using a third-party permission service (e.g., Permit.io), encapsulate the client in a dedicated NestJS module and sync roles via REST API at initialization [1].

**2. Deployment on Single VPS (Caddy)**
*   **Unified Serving:** Serve the compiled React build (including the new admin section) as static files directly from NestJS using `@nestjs/serve-static` [4].
*   **Caddy Config:** Caddy proxies a single port (e.g., `3000`) to the NestJS container. You can route `admin.example.com` to the same backend but serve a different entry point if needed, or simply use a path like `example.com/operator` to avoid subdomain complexity [4].
*   **Avoid CORS:** Serving React from NestJS eliminates cross-origin problems entirely, collapsing deployment to a single container [4].

**3. When to Choose (c) Server-Rendered Pages**
*   Choose this if the operator panel is **read-only** (e.g., simple status logs, configuration tables) and requires **fast initial loads** or **SEO** [12].
*   Use React/SSR hybrids for "admin panels with simple interactions" where minimizing JavaScript bundle size is critical [12].
*   *Note:* For a "status panel" needing real-time updates (e.g., WebSocket streams), SSR is often a poor choice unless you implement progressive enhancement carefully [12].

### Recommendation Summary
*   **Default to (b):** For a small team, the overhead of a second SPA (a) is rarely justified. Reusing the existing auth and build pipeline is the most efficient path.
*   **Avoid (a) unless:** The operator panel requires a completely different tech stack (e.g., heavy data visualization libraries that conflict with the main app) or is a multi-tenant product sold to other companies.
*   **Avoid (c) unless:** The panel is purely informational and read-only, or you are constrained by a strict requirement for zero JavaScript bundles.

**Critical Pitfall:** If you choose (b), ensure the operator panel's components are modularized (e.g., in a dedicated `src/operator` folder) to avoid cluttering the main user cabinet codebase as the panel grows [7].

---

## Q2-auth — Модель авторизации: публичная витрина + разделы с уровнями доступа

**Запрос:** Best practice 2025-2026 for authentication and lightweight RBAC in a small internal operator panel (under 10 users, levels like public/ally/operator/owner): public landing page without login, gated sections per role. Compare: reusing an existing JWT/bearer token auth service from another app of the same platform, magic links via email, short-lived signed access tokens issued manually, OAuth (GitHub) with allowlist, and static shared tokens. Which options avoid running a new user database on a stateless NestJS service, and what are common security pitfalls (token in localStorage vs httpOnly cookie, CSRF for cookie-based, public API endpoints leaking operational data)?

**Выжимка:**

For a small internal operator panel (under 10 users) with a stateless NestJS service, the **best practice for 2025–2026** is to use **OAuth (GitHub) with an allowlist** for authentication. This option avoids running a new user database, provides strong identity verification, and naturally supports lightweight RBAC by storing roles in the JWT payload or a local configuration map keyed by GitHub user ID.

### Options That Avoid a New User Database
The following options allow you to skip a dedicated user database on your stateless NestJS service:

| Option | Avoids New DB? | Mechanism for RBAC | Suitability for <10 Users |
|--------|----------------|--------------------|---------------------------|
| **OAuth (GitHub) + allowlist** | ✅ Yes | Store roles in a local `roles.json` or env map keyed by GitHub `user_id`; embed roles in JWT or validate against the map | **High** (secure, easy allowlist management) |
| **Reuse existing JWT/bearer service** | ✅ Yes | Roles are already in the existing token; share the same issuer/audience validation | **High** (if already trusted) |
| **Magic links via email** | ❌ No (requires email-to-user mapping) | Requires storing email→role mapping; effectively a mini-user DB | Low (adds complexity for tiny teams) |
| **Short-lived signed tokens (manual)** | ❌ No (requires token-to-user mapping) | Must track who issued which token and their role; implies a DB or config file | Medium (good for one-off access, not persistent roles) |
| **Static shared tokens** | ❌ No (no per-user identity) | Impossible to enforce per-role gating (public/ally/operator/owner) | **Low** (security risk: no user distinction) |

**Static shared tokens** are the only option that *technically* avoids a database but fails the requirement for **role-based gating** (you cannot distinguish between "ally" and "operator" if everyone shares the same token).

### Recommended Architecture: OAuth (GitHub) + Allowlist
1. **Authentication**: Use `@nestjs/passport` with the GitHub OAuth strategy.
2. **Allowlist**: Maintain a small `allowed-github-users.json` file (or env var) mapping GitHub `user_id` → role (e.g., `{ "12345": "operator", "67890": "owner" }`).
3. **RBAC**:
   - Create a `RolesGuard` that checks the user’s role from the allowlist against the required role on the route (decorated with `@Roles('operator')`).
   - Optionally, embed the role in the JWT for faster access, but re-validate against the allowlist for security.
4. **Stateless NestJS**: No database needed; the allowlist is a static file loaded at startup.

### Common Security Pitfalls & Mitigations

#### 1. Token Storage: `localStorage` vs `httpOnly` Cookie
| Storage | Risk | Mitigation |
|---------|------|------------|
| **`localStorage` (Bearer token)** | ❌ **XSS**: Any injected script can read the token and impersonate the user. | ❌ Avoid for sensitive internal tools. |
| **`httpOnly` Cookie** | ✅ **XSS-safe**: Scripts cannot read the cookie. | ✅ **Use this**. Set `secure: true`, `sameSite: 'strict'`, and `httpOnly: true`. |

**Recommendation**: Use **`httpOnly` cookies** for the JWT. NestJS’s `cookie-parser` and `express-session` (or custom cookie middleware) can handle this. Avoid bearer tokens in `localStorage` for internal tools.

#### 2. CSRF for Cookie-Based Auth
- **Risk**: If cookies are used, Cross-Site Request Forgery (CSRF) can trick the browser into making unauthorized requests.
- **Mitigation**:
  - Set `sameSite: 'strict'` (or `'lax'` if needed for redirects).
  - Implement a **CSRF token** (double-submit cookie pattern) for state-changing endpoints (POST/PUT/DELETE).
  - Use `@nestjs/csrf` or a custom guard to validate the `Origin`/`Referer` header.

#### 3. Public API Endpoints Leaking Operational Data
- **Risk**: Unprotected endpoints (e.g., `/api/status`, `/api/logs`) may return sensitive data (internal IPs, db configs, user emails) to anyone.
- **Mitigation**:
  - **Default to protected**: Register the `AuthGuard` globally in NestJS and only mark specific routes as public using a `@Public()` decorator.
  - **Audit all endpoints**: Ensure no operational data is returned without role checks.
  - **Use RBAC guards**: Apply `@Roles('owner')` to sensitive endpoints; the `RolesGuard` should reject if the role doesn’t match.

### Implementation Sketch (NestJS)
```typescript
// roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.role === role);
  }
}

// controller.ts
@Get('internal-data')
@Roles('operator', 'owner')
@UseGuards(RolesGuard)
getInternalData() {
  return { sensitive: 'data' };
}
```

### Final Recommendation
- **Use GitHub OAuth with an allowlist**: It’s the only secure, database-free option that supports per-role gating.
- **Store JWT in `httpOnly` cookies**: Prevents XSS; add CSRF protection for state-changing requests.
- **Default to protected routes**: Use a global `AuthGuard` and only expose public landing pages with a `@Public()` decorator.
- **Avoid static tokens**: They cannot enforce role-based access and are a critical security risk.

This approach aligns with 2025–2026 best practices for lightweight, secure internal tools with minimal infrastructure.

---

## Q3-risk — Риски публичных статус-панелей с операционными данными

**Запрос:** What are documented risks and mitigations for public or semi-public status dashboards exposing operational/engineering data (CI drift, model metrics, task registries) for a small product: information leakage useful to attackers or competitors, scraping, subdomain enumeration, auth bypass via direct API endpoints behind the dashboard, and cache/CDN pitfalls? Concise checklist of mitigations for a Caddy + SPA + JSON API setup, 2024-2026 sources.

**Выжимка:**

Documented risks for exposing operational/engineering dashboards (CI drift, model metrics, task registries) include **information leakage** that aids attackers (e.g., revealing internal architecture, data schemas, or failure patterns) and competitors (e.g., benchmarking model performance or release velocity), **unrestricted scraping** of metrics, **subdomain enumeration** through dashboard-linked assets, **auth bypass** via direct API endpoints exposed behind the dashboard, and **cache/CDN pitfalls** where sensitive data is cached publicly or served without authentication [1][3][5].

### Key Risks & Evidence
| Risk Category | Documented Impact |
|---------------|-----------------|
| **Info Leakage** | Dashboards revealing drift thresholds, model versions, or feature distributions help attackers craft targeted exploits or competitors infer product maturity [1][3] |
| **Scraping** | Automated harvesting of metrics (AUC, PSI, build times) enables competitive intelligence or attack pattern analysis [4][8] |
| **Subdomain Enum.** | Dashboard assets (JS, images) often expose internal subdomains or service endpoints via DNS/JS analysis [5] |
| **Auth Bypass** | Direct API endpoints behind dashboards (e.g., `/api/drift`, `/api/models`) may lack auth if CORS/headers misconfigured, allowing unauthenticated data access [1][8] |
| **Cache/CDN Pitfalls** | Sensitive JSON responses cached by CDNs (e.g., Cloudflare, Nginx) can be served to unauthenticated users if `Cache-Control` headers missing [5] |

> Note: While dashboards improve visibility, studies show they **do not reduce risk without an operating model**—review cadence, alerting policies, and incident response are critical [5]. Over-reliance on dashboards also creates "error-prone, time-consuming" manual thresholding vs. automated policy enforcement [2].

---

### Concise Mitigation Checklist: Caddy + SPA + JSON API (2024–2026)

#### **1. Authentication & Access Control**
- **Require auth for all SPA/API routes**: Use Caddy’s `auth` middleware with JWT/OAuth2; never allow public access to `/api/*` [1][8].
- **Enforce strict CORS**: Only allow SPA origin; block direct API calls from browsers/unknown origins [5].
- **Rate-limit API endpoints**: Prevent scraping via Caddy’s `limit` middleware (e.g., 100 req/min per IP) [8].

#### **2. Data Minimization & Sanitization**
- **Filter sensitive fields**: Remove `feature_names`, `model_version`, `internal_errors` from JSON responses; expose only aggregated metrics (e.g., AUC, PSI) [1][3].
- **Use synthetic thresholds**: Replace real drift thresholds with rounded/obfuscated values (e.g., "AUC > 0.85" → "AUC > ★") [4].
- **Avoid raw data dumps**: Never expose histograms, feature distributions, or task registries in dashboards [8].

#### **3. API Security**
- **Direct API auth bypass prevention**: Ensure all API endpoints require `Authorization` headers; Caddy’s `reverse_proxy` must validate tokens before forwarding [1][8].
- **Disable debug endpoints**: Block `/debug`, `/metrics`, `/health` from public access via Caddy `not` matcher [5].
- **Validate input schemas**: Use CI stages to validate drift config (e.g., feature existence, threshold bounds) before deployment [1].

#### **4. Cache & CDN Pitfalls**
- **Set `Cache-Control: no-store`** for all JSON/API responses; Caddy config:  
  ```caddy
  handle /api/* {
    header Cache-Control "no-store"
    reverse_proxy localhost:8080
  }
  ```
- **Avoid CDN caching for dynamic data**: Mark SPA assets as cacheable, but API responses as private [5].
- **Use ETags with auth**: Only serve cached content if `Authorization` header present [8].

#### **5. Monitoring & Alerting**
- **Automate alerting on SLO breaches**: Alert only on quality SLI (e.g., AUC drop >5%) not raw drift alarms [8].
- **Implement two-stage gates**: Require statistical significance + business impact (e.g., expected loss >$X/day) before rolling back [8].
- **Audit dashboard access**: Track who views dashboards and flag unusual scraping patterns [6].

#### **6. Operational Policies**
- **Require drift review checklist**: Add "Drift metrics reviewed" checkbox to model PRs [1].
- **Document monitoring changes**: Include drift behavior in release notes for on-call engineers [1].
- **Separate model/workflow monitoring**: Ensure drift dashboards don’t miss bypassed approvals [6].

> **Critical**: Dashboards are **investigation triggers**, not retraining triggers—map retraining plans to data readiness and exam cycles [3]. Avoid "dashboard kill" by building **policies not dashboards** [2].

---

### Sources & Timeline
- **2026**: CI/CD drift monitoring checklists, auth bypass prevention, SLO-based alerting [1][8]
- **2025**: Cache/CDN pitfalls, subdomain enumeration risks, data minimization [5]
- **2024**: Model drift detection methods (PSI, KS tests), policy-over-dashboard approach [2][4]

All mitigations align with **Caddy’s native middleware** (`auth`, `limit`, `header`, `reverse_proxy`) and **SPA security best practices** (CORS, JWT validation).

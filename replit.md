# SecureFlow - Multi-Tenant Transport Insurance Management System

## Overview

SecureFlow is a multi-tenant transport insurance management system for bus passengers in Benin. It features 3-level role-based access: Super Admin (SecureFlow owner) manages all insurance companies and transport companies, Insurance Admins manage their agents and passengers, and Field Agents register passengers via mobile-friendly interface. The interface is in French and targets transport companies operating between cities such as Cotonou, Parakou, Porto-Novo, and others.

## User Preferences

Preferred communication style: Simple, everyday language (French).

## System Architecture

### Authentication & Roles
- **Session-based auth** using `express-session` with PostgreSQL session store (`connect-pg-simple`)
- **Password hashing** with `bcryptjs`
- **Three roles**:
  - `super_admin` — Full access: manage insurances, transport companies, view all passengers, revenue, action logs
  - `insurance_admin` — Insurance-scoped: manage own agents, view own passengers, change passenger status, view own stats
  - `agent` — Limited: mobile registration form, personal stats counter, registration history
- **Super Admin credentials**: Clarence / 50363636+56501348 (or Eric / same password)
- **Session syncing**: `/api/auth/me` syncs session role and insuranceId from DB on each call

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Charts**: Recharts (BarChart, PieChart) for dashboard analytics
- **QR Codes**: `qrcode.react` for rendering QR codes on client
- **Build Tool**: Vite
- **Auth Context**: `client/src/hooks/use-auth.tsx` provides AuthProvider and useAuth hook

### Pages & Layouts
- Login page (when unauthenticated)

**Super Admin** (sidebar layout via AppSidebar):
- `/` — Dashboard with stats cards, monthly chart, insurance distribution pie, top destinations, top agents
- `/insurances` — Insurance company CRUD (create with admin account, edit, toggle status, delete)
- `/transport` — Transport company CRUD (create, edit, toggle status, delete)
- `/passengers` — All passengers list with search/filter
- `/revenue` — Revenue by insurance with date range filter
- `/logs` — Paginated action history
- `/settings` — Account settings (profile edit, password change)

**Insurance Admin** (sidebar layout via InsuranceSidebar):
- `/` — Dashboard with own stats
- `/agents` — Agent CRUD (add agent with login credentials, delete)
- `/passengers` — Own passengers with status management (en_attente → contrat_cree → valide)
- `/stats` — Statistics view
- `/settings` — Account settings (profile edit, password change with OTP verification)

**Agent** (mobile-first, no sidebar):
- Full-screen registration form with personal stats, ticket view, registration history
- Settings accessible via gear icon in header (profile edit, password change with OTP verification)

**Public**:
- `/verify/:id` — Public verification page for insurance policies (no auth required)

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript, executed via `tsx`
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Auth middleware**: `requireAuth`, `requireSuperAdmin`, `requireInsuranceAdmin`, `requireSuperOrInsurance`

### API Endpoints
**Auth:**
- `POST /api/auth/login` — Login with username/password (or email)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user with insuranceName/insuranceLogo

**Profile/Settings:**
- `PATCH /api/profile` — Update profile (fullName, username, email) with Zod validation
- `POST /api/profile/change-password` — Change password (super_admin: direct, insurance_admin/agent: sends OTP via email)
- `POST /api/profile/verify-password-change` — Verify OTP code and apply password change

**Passengers:**
- `POST /api/passengers` — Create passenger (requireAuth, auto-assigns agent's insurance)
- `GET /api/passengers` — All passengers (requireSuperAdmin)
- `GET /api/passengers/recent` — Recent passengers (role-scoped)
- `GET /api/passengers/:id` — Single passenger (requireSuperAdmin)

**Public:**
- `GET /api/verify/:identifier` — Public verification (by id or QR code)

**Transport Companies:**
- `GET /api/transport-companies` — Active transport companies (requireAuth, for agent dropdowns)

**Agent-specific:**
- `GET /api/agent/stats` — Agent's own stats (today/week/month/total)
- `GET /api/agent/passengers` — Agent's own passenger history

**Insurance Admin:**
- `GET /api/insurance/stats` — Insurance stats
- `GET /api/insurance/passengers` — Passengers of this insurance
- `PATCH /api/insurance/passengers/:id/status` — Change passenger status
- `GET /api/insurance/agents` — Insurance's agents
- `POST /api/insurance/agents` — Create agent for this insurance
- `DELETE /api/insurance/agents/:id` — Delete agent
- `GET /api/insurance/legal-info` — Get insurance legal information (Code CIMA fields)
- `PATCH /api/insurance/legal-info` — Update insurance legal information (23 fields)

**Super Admin - Insurance Management:**
- `GET /api/admin/insurances` — All insurances
- `POST /api/admin/insurances` — Create insurance (with admin user)
- `PATCH /api/admin/insurances/:id` — Update insurance
- `DELETE /api/admin/insurances/:id` — Delete insurance

**Super Admin - Transport Companies:**
- `GET /api/admin/transport-companies` — All transport companies
- `POST /api/admin/transport-companies` — Create transport company
- `PATCH /api/admin/transport-companies/:id` — Update
- `DELETE /api/admin/transport-companies/:id` — Delete

**Super Admin - Stats & Reports:**
- `GET /api/admin/stats` — Global statistics
- `GET /api/admin/stats/by-company` — Stats by company
- `GET /api/admin/stats/by-destination` — Stats by destination
- `GET /api/admin/stats/monthly` — Monthly passenger counts
- `GET /api/admin/stats/insurance-distribution` — Passenger distribution by insurance
- `GET /api/admin/stats/top-agents` — Top performing agents
- `GET /api/admin/logs` — Paginated action logs
- `GET /api/admin/revenue` — Revenue by insurance (date-filtered)

### Database
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Tables**:
  - `insurances` — id, name, email, logo, commissionPerPassenger (default 50), status, createdAt, plus 23 legal info columns (raisonSociale, formeJuridique, capitalSocial, siegeSocial, telephone, siteWeb, numeroAgrementCima, numeroIfu, garantieDeces, garantieInvalidite, garantieFraisMedicaux, garantieRapatriement, dureeValidite, franchise, typePolice, souscripteur, hotlineSinistres, emailSinistres, urlDeclarationSinistre, documentsRequis, exclusions, emailReclamations, urlConditionsGenerales)
  - `transport_companies` — id, name, contact, phone, email, status, createdAt
  - `users` — id, username, password (hashed), fullName, email, role (super_admin/insurance_admin/agent), photo, insuranceId (FK), createdAt
  - `passengers` — id, fullName, phone, email, emergencyContact*, documentType/Number, destination, company, busNumber, travelDate/Time, price, qrCode, status (en_attente/contrat_cree/valide), agentId, insuranceId, commissionGenerated, createdAt
  - `action_logs` — id, userId, userName, action, details, createdAt
  - `invoices` — id, insuranceId, period, totalPassengers, totalRevenue, commissionTotal, status, createdAt
  - `verification_codes` — id, userId, code, expiresAt, used, createdAt (for password change OTP verification)
- **Migrations**: Drizzle Kit with `db:push` command
- **Seeding**: `server/seed.ts` creates super admin users + sample data

### Shared Code
- `shared/schema.ts` contains Drizzle table definitions, Zod schemas, TypeScript types, and constant arrays for destinations and documentTypes.

### Key Design Decisions
1. **Multi-tenant architecture** — Each insurance company is a tenant with its own admin and agents
2. **Commission tracking** — Each passenger registration generates commission (default 50 CFA) for the insurance
3. **Status workflow** — Passengers go through: en_attente → contrat_cree → valide
4. **Transport companies** — Managed entities fetched from API (not hardcoded)
5. **Action logging** — All significant actions logged with userId, action, details
6. **QR code format** — SECUREFLOW-{paddedId} for verification
7. **Agent auto-assignment** — Passengers automatically assigned to agent's insurance company
8. **Session role syncing** — /api/auth/me endpoint keeps session role in sync with DB
9. **Code CIMA legal compliance** — Insurance companies can manage 23 legal information fields (identity, guarantees, claims contacts, documents, exclusions) displayed on tickets and verification pages
10. **Insurance info management** — 4-tab settings page (Legal Info, Guarantees, Claims Contacts, Documents & Exclusions) at /insurance-info for insurance admins

## External Dependencies

### Required Services
- **PostgreSQL Database** — Required. Connection string via `DATABASE_URL`.
- **Resend** — Email service for sending ticket PDFs and insurance notifications

### Key NPM Packages
- `express`, `express-session`, `connect-pg-simple` — HTTP server & sessions
- `bcryptjs` — Password hashing
- `drizzle-orm`, `drizzle-kit`, `pg` — Database ORM
- `zod`, `drizzle-zod` — Schema validation
- `qrcode.react` — QR code rendering
- `recharts` — Dashboard charts
- `wouter` — Client-side routing
- `@tanstack/react-query` — Data fetching
- `react-hook-form` — Form management

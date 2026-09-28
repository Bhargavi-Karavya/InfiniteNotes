# InfiniteNotes

Lyrics discovery platform for searching and viewing songs, artists, and lyrics.

This repository currently includes the **database schema** and **secure admin authentication foundation**. Public browsing UI and admin CRUD are not built yet.

## Technology stack

- **Next.js** (App Router) — single app for public site + admin dashboard
- **TypeScript** (strict)
- **PostgreSQL** + **Drizzle ORM**
- **Tailwind CSS**
- **Zod** validation
- **bcryptjs** password hashing
- **jose** signed httpOnly session cookies
- **ESLint**

## Route map

| Path | Purpose |
|------|---------|
| `/` | Public home (placeholder) |
| `/search` | Search (placeholder) |
| `/songs` | Songs listing (placeholder) |
| `/artists` | Artists listing (placeholder) |
| `/admin` | Admin overview (**ADMIN only**) |
| `/admin/login` | Admin authentication |
| `/admin/songs` | Manage songs placeholder (**ADMIN only**) |
| `/admin/artists` | Manage artists placeholder (**ADMIN only**) |
| `/api/health` | Database health check |
| `/api/auth/login` | Admin login |
| `/api/auth/logout` | Logout |
| `/api/songs` | Songs API scaffold |
| `/api/artists` | Artists API scaffold |
| `/api/search` | Search API scaffold |

## Folder structure

```text
src/
  app/
    (public)/              # Public website pages
    admin/
      login/               # Public admin login
      (protected)/         # requireAdmin() server gate
    api/auth/              # login / logout
  components/admin/        # Login form, logout button
  db/schema/               # users, artists, songs
  lib/auth/                # password + session helpers
  repositories/            # DB access (users)
  services/                # Auth business logic
  validations/             # Zod schemas
  proxy.ts                 # Cookie/role gate for /admin/*
scripts/
  db-health.ts
  seed-admin.ts
drizzle/                   # SQL migrations
```

## Environment setup

1. Copy the example env file:

```bash
cp .env.example .env.local
```

2. Set required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session signing secret (**min 32 characters**) |
| `NEXT_PUBLIC_SITE_URL` | Canonical production origin (e.g. `https://infinitenotes.tech`). Local may use `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_URL` | Optional fallback when `NEXT_PUBLIC_SITE_URL` is unset |
| `ADMIN_NAME` | Seed admin display name (`db:seed` only) |
| `ADMIN_EMAIL` | Seed admin email (`db:seed` only) |
| `ADMIN_PASSWORD` | Seed admin password (`db:seed` only) — never commit real secrets |

Never commit real secrets. `.env*` files are gitignored except `.env.example`.

Note: a `DATABASE_URL` already set in your shell/OS environment overrides values from `.env` / `.env.local` (Next.js behavior). Unset it if local file config seems ignored.

## PostgreSQL setup

1. Install and start PostgreSQL locally (or use Docker/hosted Postgres).
2. Create a database:

```sql
CREATE DATABASE infinitenotes;
```

3. Set `DATABASE_URL` in `.env.local`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/infinitenotes
```

## Database migration

Apply schema **only** through Drizzle migrations (do not hand-edit production tables):

```bash
# Generate SQL from schema changes (when you edit src/db/schema)
npm run db:generate

# Apply pending migrations to PostgreSQL
npm run db:migrate

# Optional connectivity check
npm run db:check

# Optional Drizzle Studio
npm run db:studio
```

`npm run db:push` is available for experimental local prototyping, but **prefer `db:migrate`** so schema history stays reproducible.

## Seed admin user

```bash
npm run db:seed
```

Reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from the environment, hashes the password with bcrypt, and inserts an `ADMIN` user.

- Re-running the seed is safe: if the email already exists, seeding is skipped.
- Do not put real production passwords in README or source control.

## Authentication flow

1. Admin opens `/admin/login` and submits email + password.
2. Input is validated with Zod (`loginSchema`).
3. `authenticateUser()` looks up the user and verifies the bcrypt hash.
4. Failures always return the generic message **Invalid email or password** (no email/role leakage).
5. Only users with role `ADMIN` receive a signed httpOnly session cookie (`in_session`).
6. `proxy.ts` blocks `/admin/*` (except login) without a valid ADMIN session.
7. Protected admin layouts call `requireAdmin()`, which re-verifies the session against the database.
8. Logout clears the session cookie via `POST /api/auth/logout` and redirects to `/admin/login`.

Passwords are never stored or returned in plaintext. `passwordHash` is never included in API responses.

## Development login instructions

1. Configure `.env.local` (`DATABASE_URL`, `AUTH_SECRET`, admin seed vars).
2. Run migrations: `npm run db:migrate`
3. Seed admin: `npm run db:seed`
4. Start app: `npm run dev`
5. Visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
6. Sign in with the seeded `ADMIN_EMAIL` / `ADMIN_PASSWORD`

## Development commands

```bash
npm install
npm run dev
npm run build
npm start
npm run lint
```

## Intentionally deferred

- Artist / song CRUD
- Search implementation
- Public song/lyrics UI
- User registration
- Comments, annotations, playback, AI, payments

# Art Catalog

MySQL-first art cataloging app using Next.js + Prisma.

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Update `.env` values for your local MySQL and session secret.
   - Keep `UPLOAD_DIR=./public/uploads` unless you also add custom file serving.
   - Keep `STORAGE_MODE=local` for local development.
3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run migrations:

```bash
npm run prisma:migrate
```

5. Seed an admin user:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=change-me npm run seed:admin
```

6. Start the app:

```bash
npm run dev
```

## Current API Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/artworks`
- `POST /api/artworks`
- `GET /api/artworks/:id`
- `PATCH /api/artworks/:id`
- `DELETE /api/artworks/:id`

## Production Storage (Railway + Private R2)

Use private Cloudflare R2 in production and local filesystem in development.

### Required production env vars

- `STORAGE_MODE=r2`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_SIGNED_URL_TTL_SECONDS` (optional, defaults to 900)

`R2_ENDPOINT` is optional. If omitted, the app derives it from `R2_ACCOUNT_ID`.

### Railway deployment checklist

1. Create Railway project and connect this repository.
2. Add a MySQL service and set app `DATABASE_URL` from Railway.
3. Set app env vars (`SESSION_SECRET`, storage mode, R2 vars).
4. Run migrations in Railway environment:

```bash
npm run prisma:migrate
```

5. Deploy app service and verify login/upload flows.

## Migrate Existing Local Uploads to R2

If you already have files in `public/uploads`, migrate them once:

Dry run:

```bash
npm run migrate:uploads:r2 -- --dry-run
```

Actual migration:

```bash
npm run migrate:uploads:r2
```

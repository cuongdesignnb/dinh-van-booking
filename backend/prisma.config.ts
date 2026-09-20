import path from 'node:path';
import { defineConfig } from 'prisma/config';

// The URL is assembled at runtime from DB_* env vars plus the password file
// (see scripts/run-with-db-url.mjs), so no connection string with a password
// ever lands in the repo or an image. `prisma generate` runs without it.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: { path: path.join('prisma', 'migrations') },
  datasource: { url: process.env.DATABASE_URL },
});

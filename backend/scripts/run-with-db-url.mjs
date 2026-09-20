// Builds DATABASE_URL from DB_* variables and the mounted password file, then
// runs the given command. Keeps credentials out of env files and images.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const {
  DB_HOST = 'postgres',
  DB_PORT = '5432',
  DB_NAME = 'dvb_booking',
  DB_USER = 'dvb_app',
  DB_PASSWORD_FILE,
  DB_PASSWORD,
} = process.env;

const password = DB_PASSWORD ?? (DB_PASSWORD_FILE ? readFileSync(DB_PASSWORD_FILE, 'utf8').trim() : '');
if (!password) {
  console.error('No database password: set DB_PASSWORD_FILE or DB_PASSWORD.');
  process.exit(1);
}

const url = `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(password)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`;
const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/run-with-db-url.mjs <command> [args...]');
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DATABASE_URL: url, PRISMA_DATABASE_URL: url },
});
child.on('exit', (code) => process.exit(code ?? 1));

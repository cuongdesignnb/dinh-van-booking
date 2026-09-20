import 'reflect-metadata';
import { createInterface } from 'node:readline/promises';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { buildDatabaseUrl } from '../common/config/env';
import { hashPassword } from '../common/crypto';
import { ROLES } from '../common/permissions';

/**
 * Creates the first Owner account. The password is read from a file or typed in
 * the terminal — it is never a default like admin/123456, never a CLI argument
 * (those land in shell history and process lists) and never logged.
 *
 *   npm run create-owner -- --email chu@vidu.vn --password-file /run/secrets/owner_password
 */
function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const MIN_LENGTH = 12;

function assertStrong(password: string): void {
  const problems: string[] = [];
  if (password.length < MIN_LENGTH) problems.push(`tối thiểu ${MIN_LENGTH} ký tự`);
  if (!/[a-z]/.test(password)) problems.push('cần chữ thường');
  if (!/[A-Z]/.test(password)) problems.push('cần chữ hoa');
  if (!/[0-9]/.test(password)) problems.push('cần chữ số');
  if (problems.length) throw new Error(`Mật khẩu yếu: ${problems.join(', ')}`);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: buildDatabaseUrl() }) });
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const email = (arg('email') ?? (await rl.question('Email chủ sở hữu: '))).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email không hợp lệ');

    const fullName = (arg('name') ?? (await rl.question('Họ tên: '))).trim() || 'Chủ sở hữu';

    const passwordFile = arg('password-file');
    const password = passwordFile
      ? readFileSync(passwordFile, 'utf8').trim()
      : await rl.question('Mật khẩu (không hiển thị lại): ');
    assertStrong(password);

    const ownerRole = await prisma.role.findUnique({ where: { code: ROLES.owner } });
    if (!ownerRole) throw new Error('Chưa seed vai trò. Chạy `npm run seed` trước.');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error(`Đã có tài khoản ${email}`);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash: await hashPassword(password),
        roles: { create: { roleId: ownerRole.id } },
      },
    });

    console.log(`Đã tạo chủ sở hữu ${user.email} (${user.id}).`);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

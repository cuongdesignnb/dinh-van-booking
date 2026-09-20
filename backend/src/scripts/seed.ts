import 'reflect-metadata';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { buildDatabaseUrl } from '../common/config/env';
import {
  PERMISSIONS,
  PERMISSION_MODULES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type PermissionCode,
} from '../common/permissions';

/**
 * Seeds the fixed vocabulary the system needs to run: permission codes, roles
 * and their grants. It is idempotent and creates no people and no demo data —
 * the first account is made by `create-owner`.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: buildDatabaseUrl() }) });

  const descriptions: Record<PermissionCode, string> = {
    'booking.read': 'Xem đơn đặt phòng',
    'booking.write': 'Tạo và sửa đơn đặt phòng',
    'booking.cancel': 'Huỷ đơn và hoàn tiền cọc',
    'inventory.write': 'Sửa tồn phòng, khoá phòng',
    'catalog.read': 'Xem nơi lưu trú, hạng phòng, combo',
    'catalog.write': 'Sửa nơi lưu trú, hạng phòng, giá, combo',
    'content.read': 'Xem nội dung và trang',
    'content.write': 'Soạn thảo nội dung',
    'content.publish': 'Xuất bản nội dung ra site công khai',
    'media.read': 'Xem thư viện ảnh',
    'media.write': 'Tải ảnh lên, sửa thông tin ảnh',
    'media.delete': 'Xoá ảnh khỏi thư viện',
    'crm.read': 'Xem khách hàng và yêu cầu tư vấn',
    'crm.write': 'Sửa khách hàng, ghi nhận trao đổi',
    'finance.read': 'Xem thanh toán, hoàn tiền, báo cáo',
    'finance.write': 'Ghi nhận thanh toán và hoàn tiền',
    'settings.read': 'Xem cấu hình hệ thống',
    'settings.write': 'Sửa cấu hình hệ thống',
    'user.read': 'Xem tài khoản nhân sự',
    'user.write': 'Tạo, sửa, khoá tài khoản nhân sự',
    'audit.read': 'Xem nhật ký thao tác',
  };

  for (const code of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: descriptions[code], module: PERMISSION_MODULES[code] },
      update: { description: descriptions[code], module: PERMISSION_MODULES[code] },
    });
  }

  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      create: { code: roleCode, name: ROLE_LABELS[roleCode] ?? roleCode },
      update: { name: ROLE_LABELS[roleCode] ?? roleCode },
    });

    const permissions = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
    // Re-grant from scratch so a removed code in the registry is revoked here too.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
    console.log(`role ${roleCode}: ${permissions.length} quyền`);
  }

  const [permissionCount, roleCount, userCount] = await Promise.all([
    prisma.permission.count(),
    prisma.role.count(),
    prisma.user.count(),
  ]);
  console.log(`\n${permissionCount} quyền, ${roleCount} vai trò, ${userCount} tài khoản.`);
  if (userCount === 0) {
    console.log('Chưa có tài khoản nào. Tạo chủ sở hữu bằng: npm run create-owner');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ContentController } from '../content/content.controller';
import { MediaController } from '../media/media.controller';
import { SettingsController } from '../settings/settings.controller';
import { AdminOperationsController } from '../admin-operations/admin-operations.controller';
import { ROLE_PERMISSIONS } from './permissions';
import { PermissionsGuard } from './guards/permissions.guard';

function contextFor(
  controller: object,
  handler: object,
  permissions: readonly string[],
): ExecutionContext {
  return {
    getClass: () => controller,
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
  } as unknown as ExecutionContext;
}

const guard = new PermissionsGuard(new Reflector());

test('viewer role is rejected by the backend on CMS writes and media deletion', () => {
  assert.throws(
    () => guard.canActivate(contextFor(ContentController, ContentController.prototype.create, ROLE_PERMISSIONS.viewer)),
    ForbiddenException,
  );
  assert.throws(
    () => guard.canActivate(contextFor(MediaController, MediaController.prototype.remove, ROLE_PERMISSIONS.viewer)),
    ForbiddenException,
  );
});

test('editor can publish CMS content but cannot write privileged settings', () => {
  assert.equal(
    guard.canActivate(contextFor(ContentController, ContentController.prototype.setStatus, ROLE_PERMISSIONS.editor)),
    true,
  );
  assert.throws(
    () => guard.canActivate(contextFor(SettingsController, SettingsController.prototype.update, ROLE_PERMISSIONS.editor)),
    ForbiddenException,
  );
});

test('owner permission set satisfies the real media and settings route decorators', () => {
  assert.equal(
    guard.canActivate(contextFor(MediaController, MediaController.prototype.remove, ROLE_PERMISSIONS.owner)),
    true,
  );
  assert.equal(
    guard.canActivate(contextFor(SettingsController, SettingsController.prototype.update, ROLE_PERMISSIONS.owner)),
    true,
  );
});

test('admin finance and inventory permissions are separated by server role', () => {
  assert.ok(ROLE_PERMISSIONS.owner.includes('refund.approve'));
  assert.ok(ROLE_PERMISSIONS.accountant.includes('finance.write'));
  assert.ok(ROLE_PERMISSIONS.accountant.includes('refund.approve'));
  assert.ok(ROLE_PERMISSIONS.accountant.includes('report.read'));
  assert.ok(!ROLE_PERMISSIONS.accountant.includes('booking.write'));
  assert.ok(ROLE_PERMISSIONS.operator.includes('inventory.read'));
  assert.ok(ROLE_PERMISSIONS.operator.includes('inventory.write'));
  assert.ok(!ROLE_PERMISSIONS.editor.includes('finance.write'));
  assert.ok(!ROLE_PERMISSIONS.viewer.includes('coupon.write'));
});

test('operational endpoints enforce independent inventory, refund and report permissions', () => {
  assert.equal(
    guard.canActivate(contextFor(AdminOperationsController, AdminOperationsController.prototype.inventory, ROLE_PERMISSIONS.viewer)),
    true,
  );
  assert.throws(
    () => guard.canActivate(contextFor(AdminOperationsController, AdminOperationsController.prototype.updateInventory, ROLE_PERMISSIONS.viewer)),
    ForbiddenException,
  );
  assert.equal(
    guard.canActivate(contextFor(AdminOperationsController, AdminOperationsController.prototype.updateRefund, ROLE_PERMISSIONS.accountant)),
    true,
  );
  assert.throws(
    () => guard.canActivate(contextFor(AdminOperationsController, AdminOperationsController.prototype.createBooking, ROLE_PERMISSIONS.accountant)),
    ForbiddenException,
  );
  assert.throws(
    () => guard.canActivate(contextFor(AdminOperationsController, AdminOperationsController.prototype.report, ROLE_PERMISSIONS.operator)),
    ForbiddenException,
  );
});

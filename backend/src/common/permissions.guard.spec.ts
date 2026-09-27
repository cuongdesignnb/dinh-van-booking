import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ContentController } from '../content/content.controller';
import { MediaController } from '../media/media.controller';
import { SettingsController } from '../settings/settings.controller';
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

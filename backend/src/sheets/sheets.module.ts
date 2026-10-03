import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminSheetsController } from './sheets.controller';
import { SheetsService } from './sheets.service';
import { SheetsValuesProvider } from './sheets.provider';

@Module({ imports: [InventoryModule, SettingsModule], controllers: [AdminSheetsController], providers: [SheetsService, SheetsValuesProvider], exports: [SheetsService, SheetsValuesProvider] })
export class SheetsModule {}

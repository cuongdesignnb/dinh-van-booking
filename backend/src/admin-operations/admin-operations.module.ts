import { Module } from '@nestjs/common';
import { AdminOperationsController, PublicQuotesController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({ imports: [InventoryModule], controllers: [AdminOperationsController, PublicQuotesController], providers: [AdminOperationsService], exports: [AdminOperationsService] })
export class AdminOperationsModule {}

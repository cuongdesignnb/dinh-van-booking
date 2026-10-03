import { Module } from '@nestjs/common';
import { InventoryMutationService } from './inventory-mutation.service';

@Module({ providers: [InventoryMutationService], exports: [InventoryMutationService] })
export class InventoryModule {}

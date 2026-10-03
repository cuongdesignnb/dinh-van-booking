import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { MediaModule } from '../media/media.module';
import { PublicModule } from '../public/public.module';
import { PartnerController, AdminPartnerController } from './partner.controller';
import { PartnerService } from './partner.service';

@Module({ imports: [InventoryModule, MediaModule, PublicModule], controllers: [PartnerController, AdminPartnerController], providers: [PartnerService], exports: [PartnerService] })
export class PartnerModule {}

import { Module } from '@nestjs/common';
import { PublicCatalogService } from './public-catalog.service';
import { PublicController } from './public.controller';
import { NavigationModule } from '../navigation/navigation.module';

@Module({
  imports: [NavigationModule],
  providers: [PublicCatalogService],
  controllers: [PublicController],
  exports: [PublicCatalogService],
})
export class PublicModule {}

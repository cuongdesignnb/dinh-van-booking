import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { ContentModule } from './content/content.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';
import { InquiryModule } from './inquiries/inquiry.module';
import { CatalogModule } from './catalog/catalog.module';
import { NavigationModule } from './navigation/navigation.module';
import { AiModule } from './ai/ai.module';
import { AdminOperationsModule } from './admin-operations/admin-operations.module';
import { loadConfig } from './common/config/env';
import { PartnerModule } from './partners/partner.module';
import { SheetsModule } from './sheets/sheets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => ({ app: loadConfig() })], cache: true }),
    PrismaModule,
    AuthModule,
    SettingsModule,
    MediaModule,
    ContentModule,
    PublicModule,
    InquiryModule,
    CatalogModule,
    NavigationModule,
    AiModule,
    AdminOperationsModule,
    PartnerModule,
    SheetsModule,
    HealthModule,
  ],
})
export class AppModule {}

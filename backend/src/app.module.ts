import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { ContentModule } from './content/content.module';
import { HealthModule } from './health/health.module';
import { loadConfig } from './common/config/env';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => ({ app: loadConfig() })], cache: true }),
    PrismaModule,
    AuthModule,
    SettingsModule,
    MediaModule,
    ContentModule,
    HealthModule,
  ],
})
export class AppModule {}

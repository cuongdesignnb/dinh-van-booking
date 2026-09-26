import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

@Module({
  imports: [PrismaModule],
  controllers: [NavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}

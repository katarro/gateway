import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TestMs1Module } from './test-ms-1/test-ms-1.module';

@Module({
  imports: [AuthModule, TestMs1Module],
  controllers: [],
  providers: []
})
export class AppModule {}

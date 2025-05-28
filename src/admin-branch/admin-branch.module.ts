import { Module } from '@nestjs/common';
import { AdminBranchController } from './admin-branch.controller';
import { TransportModule } from 'src/transport/transport.module';

@Module({
  controllers: [AdminBranchController],
  imports: [TransportModule],
})
export class AdminBranchModule {}

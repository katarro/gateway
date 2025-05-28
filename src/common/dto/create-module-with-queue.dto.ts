import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateQueueDto } from './create-queue.dto';
import { CreateServiceModuleDto } from './create-service-module.dto';

export class CreateModuleWithQueueDto {
  @ValidateNested()
  @Type(() => CreateServiceModuleDto)
  module: CreateServiceModuleDto;

  @ValidateNested()
  @Type(() => CreateQueueDto)
  queue: CreateQueueDto;
}

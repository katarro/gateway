import { IsEnum } from 'class-validator';

export enum BranchStatus {
  Active = 1,
  Inactive = 0,
}

export enum RegistrationStatus {
  Pending = 'pending',
  Attended = 'attended',
  Canceled = 'canceled',
}

export class BranchStatusDto {
  @IsEnum(BranchStatus)
  branchStatus?: BranchStatus;

  @IsEnum(RegistrationStatus)
  registrationStatus?: RegistrationStatus;
}

import { Role } from '../enums';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotEmailDto{

    @IsEmail()
    @IsNotEmpty()
    email: string
}
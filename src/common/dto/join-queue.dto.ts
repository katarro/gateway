import { IsNotEmpty, IsNumber } from "class-validator";

export class JoinQueueDto{

    @IsNumber()
    @IsNotEmpty()
    userId: number
}
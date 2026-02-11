import { IsEmail, IsNotEmpty } from "class-validator";

//DATA TRANSFOR OBJECT / DTO
export class ForgotPasswordDTO {
  //DECORATOR
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

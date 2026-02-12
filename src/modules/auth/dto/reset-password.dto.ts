import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

//DATA TRANSFOR OBJECT / DTO
export class ResetPasswordDTO {
  //DECORATOR
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: "Password minimal 8 karakter" })
  //Ambil dari login ada email,password
  password!: string;
}

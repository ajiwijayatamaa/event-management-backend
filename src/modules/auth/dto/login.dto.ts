import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

//DATA TRANSFOR OBJECT / DTO
export class LoginDTO {
  //DECORATOR
  @IsNotEmpty()
  @IsEmail()
  //Ambil dari register ada email,password
  email!: string;

  //DECORATOR
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: "Password minimal 8 karakter" })
  //Ambil dari login ada email,password
  password!: string;
}

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { Role } from "../../../generated/prisma/enums.js";

//DATA TRANSFOR OBJECT / DTO
export class RegisterDTO {
  //DECORATOR
  @IsNotEmpty()
  @IsString()
  //Ambil dari register ada name,email,password,reffererCode?
  name!: string;

  //DECORATOR
  @IsNotEmpty()
  @IsEmail()
  //Ambil dari register ada name,email,password,reffererCode?
  email!: string;

  //DECORATOR
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: "Password minimal 8 karakter" })
  //Ambil dari register ada name,email,password,reffererCode?
  password!: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role!: Role;

  // FIELD OPSIONAL UNTUK REFERRAL
  // DECORATOR
  @IsOptional()
  @IsString()
  //Ambil dari register ada name,email,password,reffererCode?
  referrerCode?: string;
}

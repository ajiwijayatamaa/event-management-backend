import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password baru minimal 8 karakter" })
  newPassword!: string;
}

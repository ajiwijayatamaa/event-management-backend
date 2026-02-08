import { IsEmail, IsNotEmpty } from "class-validator";

//DATA TRANSFOR OBJECT / DTO
export class GoogleDTO {
  //DECORATOR
  @IsNotEmpty()
  @IsEmail()
  //Ambil dari register ada email,password
  accessToken!: string;
}

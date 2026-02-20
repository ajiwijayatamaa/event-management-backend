import { IsNotEmpty, IsString } from "class-validator";

//DATA TRANSFOR OBJECT / DTO
export class GoogleDTO {
  //DECORATOR
  @IsNotEmpty()
  @IsString()
  //Ambil dari register ada email,password
  accessToken!: string;
}

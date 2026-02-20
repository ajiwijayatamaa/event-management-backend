import { Transform } from "class-transformer";
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

//DATA TRANSFOR OBJECT / DTO
export class UpdateEventDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  @Min(0) //Harga tidak boleh minus
  price?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  availableSeats?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  totalSeats?: number;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  endDate?: Date;
}

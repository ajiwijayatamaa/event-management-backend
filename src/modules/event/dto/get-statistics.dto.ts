import { IsIn, IsNotEmpty } from "class-validator";

export class GetStatisticsDTO {
  @IsNotEmpty()
  @IsIn(["year", "month", "day"])
  period!: "year" | "month" | "day";
}

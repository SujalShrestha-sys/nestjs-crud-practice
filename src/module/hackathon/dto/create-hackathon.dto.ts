import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinDate,
  MinLength,
} from 'class-validator';

export class CreateHackathonDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date(), { message: 'startsAt must be a future date' })
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date(), { message: 'endsAt must be a future date' })
  endsAt!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

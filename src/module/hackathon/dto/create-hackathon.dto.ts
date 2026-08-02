import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'The name of the hackathon',
    example: 'AI Web3 Hackathon 2026',
  })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the hackathon',
    example: 'Build innovative AI applications using open-source tools.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Start date and time of the hackathon',
    example: '2026-09-01T09:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date(), { message: 'startsAt must be a future date' })
  startsAt!: Date;

  @ApiProperty({
    description: 'End date and time of the hackathon',
    example: '2026-09-03T18:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date(), { message: 'endsAt must be a future date' })
  endsAt!: Date;

  @ApiPropertyOptional({
    description: 'Whether the hackathon is active for registration',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

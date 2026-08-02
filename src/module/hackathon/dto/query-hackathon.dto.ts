import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum HackathonStatusFilter {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  ENDED = 'ended',
  ALL = 'all',
}

export class QueryHackathonDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter hackathons by status',
    enum: HackathonStatusFilter,
    default: HackathonStatusFilter.ALL,
  })
  @IsOptional()
  @IsEnum(HackathonStatusFilter)
  status?: HackathonStatusFilter = HackathonStatusFilter.ALL;

  @ApiPropertyOptional({ description: 'Search term for hackathon name or description' })
  @IsOptional()
  @IsString()
  q?: string;
}

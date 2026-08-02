import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ description: 'Title of the project submission', example: 'AI Health Tracker' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ description: 'Detailed description of what the project does', example: 'A real-time health monitoring app powered by NestJS and AI.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ description: 'GitHub/Git repository URL', example: 'https://github.com/user/ai-health-tracker' })
  @IsString()
  @IsUrl()
  repoUrl!: string;

  @ApiPropertyOptional({ description: 'Live web app demo URL', example: 'https://ai-health-tracker.example.com' })
  @IsOptional()
  @IsString()
  @IsUrl()
  demoUrl?: string;
}

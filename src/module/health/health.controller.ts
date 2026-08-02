import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PrismaService } from '../../lib/database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'Check health and database connectivity status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  @ResponseMessage('Health status retrieved successfully')
  async check() {
    let dbStatus = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'error',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

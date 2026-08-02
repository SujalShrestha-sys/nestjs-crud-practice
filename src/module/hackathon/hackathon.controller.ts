import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AllowAnonymous,
  AuthGuard,
  Roles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../auth';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { QueryHackathonDto } from './dto/query-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';
import { HackathonService } from './hackathon.service';

@ApiTags('Hackathon')
@UseGuards(AuthGuard)
@Controller('hackathon')
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Post()
  @Roles(['ADMIN'])
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a new hackathon (Admin only)' })
  @ApiResponse({ status: 201, description: 'Hackathon created successfully' })
  @ResponseMessage('Hackathon created successfully')
  create(
    @Body() createHackathonDto: CreateHackathonDto,
    @Session() session: UserSession<Auth>,
  ) {
    return this.hackathonService.create(createHackathonDto, session.user.id);
  }

  @Post(':id/join')
  @Roles(['PARTICIPANT'])
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Join an active hackathon (Participant only)' })
  @ApiParam({ name: 'id', description: 'Hackathon CUID' })
  @ApiResponse({ status: 200, description: 'Hackathon joined successfully' })
  @ResponseMessage('Hackathon joined successfully')
  join(@Param('id') id: string, @Session() session: UserSession<Auth>) {
    return this.hackathonService.join(id, session.user.id);
  }

  @Delete(':id/leave')
  @Roles(['PARTICIPANT'])
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Leave/unjoin a hackathon (Participant only)' })
  @ApiParam({ name: 'id', description: 'Hackathon CUID' })
  @ApiResponse({ status: 200, description: 'Successfully left the hackathon' })
  @ResponseMessage('Successfully left the hackathon')
  leave(@Param('id') id: string, @Session() session: UserSession<Auth>) {
    return this.hackathonService.leave(id, session.user.id);
  }

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'List all hackathons with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Hackathons retrieved successfully' })
  @ResponseMessage('Hackathons retrieved successfully')
  findAll(@Query() queryDto: QueryHackathonDto) {
    return this.hackathonService.findAll(queryDto);
  }

  @Get(':id/participants')
  @AllowAnonymous()
  @ApiOperation({ summary: 'List all participants registered for a hackathon' })
  @ApiParam({ name: 'id', description: 'Hackathon CUID' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  @ResponseMessage('Participants retrieved successfully')
  getParticipants(@Param('id') id: string) {
    return this.hackathonService.getParticipants(id);
  }

  @Get(':id')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Get details of a single hackathon' })
  @ApiParam({ name: 'id', description: 'Hackathon CUID' })
  @ApiResponse({ status: 200, description: 'Hackathon retrieved successfully' })
  @ResponseMessage('Hackathon retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.hackathonService.findOne(id);
  }

  @Patch(':id')
  @Roles(['ADMIN'])
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update a hackathon (Admin only)' })
  @ApiParam({ name: 'id', description: 'Hackathon CUID' })
  @ApiResponse({ status: 200, description: 'Hackathon updated successfully' })
  @ResponseMessage('Hackathon updated successfully')
  update(
    @Param('id') id: string,
    @Body() updateHackathonDto: UpdateHackathonDto,
  ) {
    return this.hackathonService.update(id, updateHackathonDto);
  }

  @Delete(':id')
  @Roles(['ADMIN'])
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete a hackathon (Admin only)' })
  @ApiParam({ name: 'id', description: 'Hackathon CUID' })
  @ApiResponse({ status: 200, description: 'Hackathon deleted successfully' })
  @ResponseMessage('Hackathon deleted successfully')
  remove(@Param('id') id: string) {
    return this.hackathonService.remove(id);
  }
}

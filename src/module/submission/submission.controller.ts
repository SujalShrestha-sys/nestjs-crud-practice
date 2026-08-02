import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionService } from './submission.service';

@ApiTags('Submission')
@UseGuards(AuthGuard)
@Controller()
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('hackathon/:hackathonId/submission')
  @Roles(['PARTICIPANT'])
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Submit a project for a hackathon (Participant only)',
  })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon CUID' })
  @ApiResponse({ status: 201, description: 'Project submitted successfully' })
  @ResponseMessage('Project submitted successfully')
  create(
    @Param('hackathonId') hackathonId: string,
    @Body() dto: CreateSubmissionDto,
    @Session() session: UserSession<Auth>,
  ) {
    return this.submissionService.create(hackathonId, session.user.id, dto);
  }

  @Get('hackathon/:hackathonId/submissions')
  @AllowAnonymous()
  @ApiOperation({ summary: 'List all project submissions for a hackathon' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon CUID' })
  @ApiResponse({
    status: 200,
    description: 'Submissions retrieved successfully',
  })
  @ResponseMessage('Submissions retrieved successfully')
  findByHackathon(@Param('hackathonId') hackathonId: string) {
    return this.submissionService.findByHackathon(hackathonId);
  }

  @Get('submission/:id')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Get submission details by ID' })
  @ApiParam({ name: 'id', description: 'Submission CUID' })
  @ApiResponse({
    status: 200,
    description: 'Submission retrieved successfully',
  })
  @ResponseMessage('Submission retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.submissionService.findOne(id);
  }

  @Delete('submission/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete a submission (Submitter or Admin)' })
  @ApiParam({ name: 'id', description: 'Submission CUID' })
  @ApiResponse({ status: 200, description: 'Submission deleted successfully' })
  @ResponseMessage('Submission deleted successfully')
  remove(@Param('id') id: string, @Session() session: UserSession<Auth>) {
    return this.submissionService.remove(
      id,
      session.user.id,
      session.user.role ?? 'PARTICIPANT',
    );
  }
}

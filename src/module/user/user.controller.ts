import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthGuard,
  Roles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../auth';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('User')
@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get profile of the signed-in user' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ResponseMessage('Profile retrieved successfully')
  getProfile(@Session() session: UserSession<Auth>) {
    return this.userService.findOne(session.user.id);
  }

  @Patch('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update profile of the signed-in user' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ResponseMessage('Profile updated successfully')
  updateProfile(
    @Session() session: UserSession<Auth>,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateProfile(session.user.id, updateUserDto);
  }

  @Get('me/hackathons')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get list of hackathons joined by signed-in user' })
  @ApiResponse({
    status: 200,
    description: 'User hackathons retrieved successfully',
  })
  @ResponseMessage('User hackathons retrieved successfully')
  getUserHackathons(@Session() session: UserSession<Auth>) {
    return this.userService.getUserHackathons(session.user.id);
  }

  @Get('all')
  @Roles(['ADMIN'])
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get all registered users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ResponseMessage('Users retrieved successfully')
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ResponseMessage('User retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}

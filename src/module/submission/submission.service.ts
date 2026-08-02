import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SubmissionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    hackathonId: string,
    userId: string,
    dto: CreateSubmissionDto,
  ) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} was not found`);
    }

    if (!hackathon.isActive) {
      throw new BadRequestException('Cannot submit to an inactive hackathon');
    }

    // Verify user is a participant
    const participant = await this.prisma.hackathonParticipant.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You must join this hackathon before submitting a project',
      );
    }

    // Check for existing submission
    const existingSubmission = await this.prisma.submission.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId,
          userId,
        },
      },
    });

    if (existingSubmission) {
      throw new BadRequestException(
        'You have already submitted a project for this hackathon',
      );
    }

    return await this.prisma.submission.create({
      data: {
        ...dto,
        hackathonId,
        userId,
      },
      include: this.submissionDetails,
    });
  }

  async findByHackathon(hackathonId: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} was not found`);
    }

    return await this.prisma.submission.findMany({
      where: { hackathonId },
      include: this.submissionDetails,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: this.submissionDetails,
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} was not found`);
    }

    return submission;
  }

  async remove(id: string, userId: string, userRole: string) {
    const submission = await this.findOne(id);

    if (submission.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You can only delete your own submission unless you are an admin',
      );
    }

    return await this.prisma.submission.delete({
      where: { id },
    });
  }

  private readonly submissionDetails = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    },
    hackathon: {
      select: {
        id: true,
        name: true,
      },
    },
  } as const;
}

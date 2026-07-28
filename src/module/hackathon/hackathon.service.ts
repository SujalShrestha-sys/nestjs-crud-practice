import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';

@Injectable()
export class HackathonService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createHackathonDto: CreateHackathonDto, authorId: string) {
    const { startsAt, endsAt, ...data } = createHackathonDto;
    const existingHackathon = await this.prisma.hackathon.findFirst({
      where: { name: data.name },
    });

    if (existingHackathon) {
      throw new BadRequestException(
        'A hackathon with this name already exists',
      );
    }

    try {
      return await this.prisma.hackathon.create({
        data: {
          ...data,
          startDate: startsAt,
          endDate: endsAt,
          authorId,
        },
        include: this.hackathonDetails,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          'A hackathon with this name already exists',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return await this.prisma.hackathon.findMany({
      include: this.hackathonDetails,
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id },
      include: this.hackathonDetails,
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${id} was not found`);
    }

    return hackathon;
  }

  async update(id: string, updateHackathonDto: UpdateHackathonDto) {
    await this.findOne(id);

    const { startsAt, endsAt, ...data } = updateHackathonDto;

    return await this.prisma.hackathon.update({
      where: { id },
      data: {
        ...data,
        ...(startsAt ? { startDate: startsAt } : {}),
        ...(endsAt ? { endDate: endsAt } : {}),
      },
      include: this.hackathonDetails,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return await this.prisma.hackathon.delete({
      where: { id },
    });
  }

  async join(hackathonId: string, userId: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(
        `Hackathon with ID ${hackathonId} was not found`,
      );
    }

    if (!hackathon.isActive) {
      throw new BadRequestException('This hackathon is not active');
    }

    if (hackathon.endDate <= new Date()) {
      throw new BadRequestException('This hackathon has already ended');
    }

    const existingParticipant =
      await this.prisma.hackathonParticipant.findUnique({
        where: {
          hackathonId_userId: {
            hackathonId,
            userId,
          },
        },
      });

    if (existingParticipant) {
      throw new BadRequestException('You have already joined this hackathon');
    }

    try {
      return await this.prisma.hackathonParticipant.create({
        data: {
          hackathonId,
          userId,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('You have already joined this hackathon');
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private readonly hackathonDetails = {
    author: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
    _count: {
      select: {
        participants: true,
      },
    },
  } as const;
}

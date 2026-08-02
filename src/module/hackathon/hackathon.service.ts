import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import {
  HackathonStatusFilter,
  QueryHackathonDto,
} from './dto/query-hackathon.dto';
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

  async findAll(queryDto?: QueryHackathonDto) {
    const page = queryDto?.page ?? 1;
    const limit = queryDto?.limit ?? 10;
    const skip = (page - 1) * limit;
    const status = queryDto?.status ?? HackathonStatusFilter.ALL;
    const q = queryDto?.q;

    const now = new Date();
    const where: Prisma.HackathonWhereInput = {};

    if (status === HackathonStatusFilter.ACTIVE) {
      where.isActive = true;
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === HackathonStatusFilter.UPCOMING) {
      where.isActive = true;
      where.startDate = { gt: now };
    } else if (status === HackathonStatusFilter.ENDED) {
      where.endDate = { lt: now };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.hackathon.findMany({
        where,
        skip,
        take: limit,
        include: this.hackathonDetails,
        orderBy: {
          startDate: 'asc',
        },
      }),
      this.prisma.hackathon.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

  async leave(hackathonId: string, userId: string) {
    const participant = await this.prisma.hackathonParticipant.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('You are not registered for this hackathon');
    }

    return await this.prisma.hackathonParticipant.delete({
      where: {
        id: participant.id,
      },
    });
  }

  async getParticipants(hackathonId: string) {
    await this.findOne(hackathonId);

    const participants = await this.prisma.hackathonParticipant.findMany({
      where: { hackathonId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return participants.map((p) => ({
      joinedAt: p.joinedAt,
      ...p.user,
    }));
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

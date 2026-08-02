import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  role: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      select: userSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} was not found`);
    }

    return user;
  }

  async updateProfile(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.findOne(id);

    return await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: userSelect,
    });
  }

  async getUserHackathons(id: string) {
    await this.findOne(id);

    const participations = await this.prisma.hackathonParticipant.findMany({
      where: { userId: id },
      include: {
        hackathon: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return participations.map((p) => ({
      joinedAt: p.joinedAt,
      hackathon: p.hackathon,
    }));
  }
}

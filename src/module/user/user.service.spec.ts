import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../lib/database/prisma.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    hackathonParticipant: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user object if user exists', async () => {
      const mockUser = { id: 'u-1', name: 'Alice', email: 'alice@example.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('u-1');
      expect(result).toEqual(mockUser);
    });
  });
});

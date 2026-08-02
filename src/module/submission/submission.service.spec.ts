import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../lib/database/prisma.service';
import { SubmissionService } from './submission.service';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    hackathon: {
      findUnique: jest.fn(),
    },
    hackathonParticipant: {
      findUnique: jest.fn(),
    },
    submission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if hackathon does not exist', async () => {
      mockPrismaService.hackathon.findUnique.mockResolvedValue(null);

      await expect(
        service.create('invalid-hack-id', 'user-1', {
          title: 'Project Title',
          description: 'Project description long enough',
          repoUrl: 'https://github.com/repo',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      mockPrismaService.hackathon.findUnique.mockResolvedValue({
        id: 'hack-1',
        isActive: true,
      });
      mockPrismaService.hackathonParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('hack-1', 'user-1', {
          title: 'Project Title',
          description: 'Project description long enough',
          repoUrl: 'https://github.com/repo',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../lib/database/prisma.service';
import { HackathonService } from './hackathon.service';

describe('HackathonService', () => {
  let service: HackathonService;

  const mockPrismaService = {
    hackathon: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    hackathonParticipant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HackathonService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HackathonService>(HackathonService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if hackathon name exists', async () => {
      mockPrismaService.hackathon.findFirst.mockResolvedValue({
        id: '1',
        name: 'Hackathon 1',
      });

      await expect(
        service.create(
          {
            name: 'Hackathon 1',
            startsAt: new Date(),
            endsAt: new Date(),
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new hackathon successfully', async () => {
      mockPrismaService.hackathon.findFirst.mockResolvedValue(null);
      mockPrismaService.hackathon.create.mockResolvedValue({
        id: 'hack-1',
        name: 'New Hackathon',
      });

      const result = await service.create(
        {
          name: 'New Hackathon',
          startsAt: new Date(),
          endsAt: new Date(),
        },
        'user-1',
      );

      expect(result).toEqual({ id: 'hack-1', name: 'New Hackathon' });
      expect(mockPrismaService.hackathon.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if hackathon does not exist', async () => {
      mockPrismaService.hackathon.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return hackathon details if found', async () => {
      const mockHackathon = { id: 'hack-1', name: 'Hackathon 1' };
      mockPrismaService.hackathon.findUnique.mockResolvedValue(mockHackathon);

      const result = await service.findOne('hack-1');
      expect(result).toEqual(mockHackathon);
    });
  });
});

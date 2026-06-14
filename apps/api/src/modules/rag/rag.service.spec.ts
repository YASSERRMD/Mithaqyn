import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RagService } from './rag.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockProvider = {
  generateText: jest.fn().mockResolvedValue('This is the AI answer based on context.'),
  generateJson: jest.fn(),
  generateEmbeddings: jest.fn(),
  streamText: jest.fn(),
  validateConfig: jest.fn().mockReturnValue(true),
  getProviderName: jest.fn().mockReturnValue('openai'),
  getModelList: jest.fn().mockReturnValue(['gpt-4o']),
};

const mockPrisma = {
  contract: {
    findUnique: jest.fn(),
  },
  chatSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
  },
};

const mockAiService = {
  getDefaultProvider: jest.fn().mockReturnValue(mockProvider),
};

const mockEmbeddingsService = {
  semanticSearch: jest.fn().mockResolvedValue([
    {
      contractId: 'contract-1',
      contractTitle: 'Service Agreement 2024',
      chunkIndex: 0,
      chunkText: 'Payment shall be due within 30 days of invoice receipt.',
      score: 0.85,
    },
    {
      contractId: 'contract-1',
      contractTitle: 'Service Agreement 2024',
      chunkIndex: 1,
      chunkText: 'Late payments shall incur a 2% monthly interest charge.',
      score: 0.72,
    },
  ]),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AIService, useValue: mockAiService },
        { provide: EmbeddingsService, useValue: mockEmbeddingsService },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  // ─── createSession ─────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('creates a session without a contractId', async () => {
      const sessionData = {
        id: 'session-1',
        userId: 'user-1',
        contractId: null,
        title: 'New Chat',
        scope: 'REPOSITORY',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.chatSession.create.mockResolvedValue(sessionData);

      const result = await service.createSession('user-1', undefined, undefined, 'REPOSITORY');

      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          contractId: null,
          title: 'New Chat',
          scope: 'REPOSITORY',
        },
      });
      expect(result).toEqual(sessionData);
    });

    it('creates a session scoped to a specific contract', async () => {
      const sessionData = {
        id: 'session-2',
        userId: 'user-1',
        contractId: 'contract-1',
        title: 'Payment Terms Chat',
        scope: 'CONTRACT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.contract.findUnique.mockResolvedValue({ id: 'contract-1', title: 'Service Agreement 2024' });
      mockPrisma.chatSession.create.mockResolvedValue(sessionData);

      const result = await service.createSession('user-1', 'contract-1', 'Payment Terms Chat', 'CONTRACT');

      expect(mockPrisma.contract.findUnique).toHaveBeenCalledWith({ where: { id: 'contract-1' } });
      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          contractId: 'contract-1',
          title: 'Payment Terms Chat',
          scope: 'CONTRACT',
        },
      });
      expect(result).toEqual(sessionData);
    });

    it('throws NotFoundException when contractId does not exist', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.createSession('user-1', 'non-existent-contract'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.chatSession.create).not.toHaveBeenCalled();
    });

    it('uses default title and scope when not provided', async () => {
      const sessionData = {
        id: 'session-3',
        userId: 'user-1',
        contractId: null,
        title: 'New Chat',
        scope: 'CONTRACT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.chatSession.create.mockResolvedValue(sessionData);

      await service.createSession('user-1');

      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          contractId: null,
          title: 'New Chat',
          scope: 'CONTRACT',
        },
      });
    });
  });

  // ─── chat ──────────────────────────────────────────────────────────────────

  describe('chat', () => {
    const mockSession = {
      id: 'session-1',
      userId: 'user-1',
      contractId: null,
      scope: 'REPOSITORY',
      title: 'Test Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockContractSession = {
      ...mockSession,
      contractId: 'contract-1',
      scope: 'CONTRACT',
    };

    beforeEach(() => {
      mockPrisma.chatMessage.create.mockResolvedValue({});
      mockPrisma.chatSession.update.mockResolvedValue({});
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      await expect(service.chat('non-existent', 'What are the payment terms?')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('performs repository-wide semantic search when scope is REPOSITORY', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.chat('session-1', 'What are the payment terms?');

      expect(mockEmbeddingsService.semanticSearch).toHaveBeenCalledWith(
        'What are the payment terms?',
        expect.any(Number),
      );
      expect(result.sessionId).toBe('session-1');
      expect(result.answer).toBe('This is the AI answer based on context.');
    });

    it('filters search results to the contract when scope is CONTRACT', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockContractSession);

      await service.chat('session-1', 'What are the payment terms?');

      expect(mockEmbeddingsService.semanticSearch).toHaveBeenCalledWith(
        'What are the payment terms?',
        expect.any(Number),
      );
    });

    it('saves user and assistant messages to the database', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      await service.chat('session-1', 'What are the payment terms?');

      // User message saved first
      expect(mockPrisma.chatMessage.create).toHaveBeenNthCalledWith(1, {
        data: {
          sessionId: 'session-1',
          role: 'user',
          content: 'What are the payment terms?',
        },
      });

      // Assistant message saved second with citations
      const secondCall = mockPrisma.chatMessage.create.mock.calls[1][0];
      expect(secondCall.data.role).toBe('assistant');
      expect(secondCall.data.content).toBe('This is the AI answer based on context.');
      expect(secondCall.data.citations).toBeDefined();
    });

    it('returns citations from semantic search results', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.chat('session-1', 'What are the payment terms?');

      expect(result.citations).toHaveLength(2);
      expect(result.citations[0]).toMatchObject({
        contractId: 'contract-1',
        contractTitle: 'Service Agreement 2024',
        score: 0.85,
      });
    });

    it('calls AI provider with the RAG system prompt', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      await service.chat('session-1', 'What are the payment terms?');

      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('What are the payment terms?'),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('legal contract assistant'),
          maxTokens: 1500,
          temperature: 0.1,
        }),
      );
    });

    it('gracefully handles AI generation failure', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockProvider.generateText.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await service.chat('session-1', 'What are the payment terms?');

      expect(result.answer).toContain('error');
    });

    it('gracefully handles embeddings service failure', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockEmbeddingsService.semanticSearch.mockRejectedValueOnce(new Error('Embedding service down'));

      const result = await service.chat('session-1', 'What are the payment terms?');

      expect(result.answer).toBeDefined();
      expect(result.citations).toHaveLength(0);
    });
  });

  // ─── getSession ────────────────────────────────────────────────────────────

  describe('getSession', () => {
    it('returns session with messages ordered by createdAt', async () => {
      const mockFullSession = {
        id: 'session-1',
        userId: 'user-1',
        contractId: null,
        scope: 'REPOSITORY',
        title: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date(), citations: null },
          { id: 'msg-2', role: 'assistant', content: 'Hi there', createdAt: new Date(), citations: null },
        ],
        contract: null,
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockFullSession);

      const result = await service.getSession('session-1');

      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          contract: { select: { id: true, title: true, status: true } },
        },
      });

      expect(result.messages).toHaveLength(2);
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      await expect(service.getSession('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteSession ─────────────────────────────────────────────────────────

  describe('deleteSession', () => {
    it('deletes the session and returns confirmation', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        contractId: null,
        scope: 'REPOSITORY',
        title: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.chatSession.delete.mockResolvedValue(mockSession);

      const result = await service.deleteSession('session-1');

      expect(mockPrisma.chatSession.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
      expect(result).toEqual({ deleted: true, sessionId: 'session-1' });
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      await expect(service.deleteSession('non-existent')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.chatSession.delete).not.toHaveBeenCalled();
    });
  });

  // ─── listSessions ──────────────────────────────────────────────────────────

  describe('listSessions', () => {
    it('lists sessions for a user ordered by updatedAt desc', async () => {
      const sessions = [
        { id: 'session-2', title: 'Chat 2', updatedAt: new Date() },
        { id: 'session-1', title: 'Chat 1', updatedAt: new Date(Date.now() - 1000) },
      ];

      mockPrisma.chatSession.findMany.mockResolvedValue(sessions);

      const result = await service.listSessions('user-1');

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { updatedAt: 'desc' },
        }),
      );

      expect(result).toHaveLength(2);
    });

    it('filters sessions by contractId when provided', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([]);

      await service.listSessions('user-1', 'contract-1');

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', contractId: 'contract-1' },
        }),
      );
    });
  });
});

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface CreateSessionBody {
  contractId?: string;
  title?: string;
  scope?: string;
}

interface ChatMessageBody {
  question: string;
}

interface AuthUser {
  id: string;
  role: UserRole;
}

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('sessions')
  @Roles(UserRole.VIEWER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new RAG chat session' })
  createSession(
    @Body() body: CreateSessionBody,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ragService.createSession(
      user.id,
      body.contractId,
      body.title,
      body.scope,
    );
  }

  @Post('sessions/:id/message')
  @Roles(UserRole.REVIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to a chat session and get an AI-powered RAG response' })
  chat(
    @Param('id') sessionId: string,
    @Body() body: ChatMessageBody,
  ) {
    return this.ragService.chat(sessionId, body.question);
  }

  @Get('sessions/:id')
  @Roles(UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a chat session with all messages' })
  getSession(@Param('id') sessionId: string) {
    return this.ragService.getSession(sessionId);
  }

  @Get('sessions')
  @Roles(UserRole.VIEWER)
  @ApiOperation({ summary: 'List all chat sessions for the current user' })
  @ApiQuery({ name: 'contractId', required: false })
  listSessions(
    @CurrentUser() user: AuthUser,
    @Query('contractId') contractId?: string,
  ) {
    return this.ragService.listSessions(user.id, contractId);
  }

  @Delete('sessions/:id')
  @Roles(UserRole.VIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a chat session and all its messages' })
  deleteSession(@Param('id') sessionId: string) {
    return this.ragService.deleteSession(sessionId);
  }
}

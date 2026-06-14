import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService, CreateReminderDto } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReminderType } from '@prisma/client';

interface AuthUser {
  id: string;
  role: string;
}

@ApiTags('notifications')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── Notifications ────────────────────────────────────────────────────────

  @Get('notifications')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'List notifications for the current user' })
  getNotifications(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getNotifications(user.id, {
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('notifications/count')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch('notifications/read-all')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch('notifications/:id/read')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markRead(id, user.id);
  }

  // ─── Reminders ────────────────────────────────────────────────────────────

  @Post('reminders')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Create a reminder' })
  createReminder(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      contractId?: string;
      title: string;
      message?: string;
      reminderType: ReminderType;
      scheduledAt: string;
      recurrence?: string;
    },
  ) {
    const dto: CreateReminderDto = {
      contractId: body.contractId,
      title: body.title,
      message: body.message,
      reminderType: body.reminderType,
      scheduledAt: body.scheduledAt,
      recurrence: body.recurrence,
    };
    return this.notificationsService.createReminder(user.id, dto);
  }

  @Get('reminders')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'List upcoming reminders for current user' })
  getReminders(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getReminders(user.id);
  }

  @Delete('reminders/:id')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Delete a reminder' })
  deleteReminder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteReminder(id, user.id);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Post('notifications/trigger-reminders')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Manually trigger all due reminders (admin)' })
  triggerDueReminders() {
    return this.notificationsService.triggerDueReminders();
  }
}

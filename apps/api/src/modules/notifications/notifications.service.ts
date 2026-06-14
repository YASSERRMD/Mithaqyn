import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationType, ReminderType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateReminderDto {
  contractId?: string;
  title: string;
  message?: string;
  reminderType: ReminderType;
  scheduledAt: string;
  recurrence?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, entityType, entityId },
    });
  }

  async getNotifications(userId: string, opts: { unreadOnly?: boolean } = {}) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async createReminder(userId: string, dto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        userId,
        contractId: dto.contractId,
        title: dto.title,
        message: dto.message,
        reminderType: dto.reminderType,
        scheduledAt: new Date(dto.scheduledAt),
        recurrence: dto.recurrence,
      },
      include: {
        contract: { select: { id: true, title: true } },
      },
    });
  }

  async getReminders(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId, isTriggered: false },
      orderBy: { scheduledAt: 'asc' },
      include: {
        contract: { select: { id: true, title: true } },
      },
    });
  }

  async deleteReminder(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.userId !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.reminder.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Finds all due reminders and creates notifications for them.
   * In production this would be invoked by @Cron scheduler.
   */
  async triggerDueReminders() {
    const now = new Date();
    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        scheduledAt: { lte: now },
        isTriggered: false,
      },
      include: {
        user: { select: { id: true } },
        contract: { select: { id: true, title: true } },
      },
    });

    const results: { reminderId: string; notificationId: string }[] = [];

    for (const reminder of dueReminders) {
      const notification = await this.createNotification(
        reminder.userId,
        NotificationType.SYSTEM,
        reminder.title,
        reminder.message ?? `Reminder: ${reminder.title}`,
        reminder.contractId ? 'CONTRACT' : undefined,
        reminder.contractId ?? undefined,
      );

      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { isTriggered: true, triggeredAt: now },
      });

      results.push({ reminderId: reminder.id, notificationId: notification.id });
    }

    return { triggered: results.length, results };
  }
}

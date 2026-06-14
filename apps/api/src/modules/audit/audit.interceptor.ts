import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Reflector } from '@nestjs/core';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AUDIT_ENTITY_KEY = 'audit_entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    const entityType = this.reflector.get<string>(AUDIT_ENTITY_KEY, context.getHandler());

    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest<{
      user?: { id?: string };
      params?: Record<string, string>;
      body?: Record<string, unknown>;
      ip?: string;
      headers?: Record<string, string>;
    }>();

    return next.handle().pipe(
      tap(() => {
        const userId = req.user?.id;
        if (!userId) return;

        const entityId =
          req.params?.id ||
          req.params?.contractId ||
          req.params?.clauseId ||
          req.params?.riskId ||
          req.params?.obligationId;

        this.auditService.log({
          userId,
          action,
          entityType: entityType ?? 'UNKNOWN',
          entityId,
          ipAddress: req.ip,
          userAgent: req.headers?.['user-agent'],
        }).catch(() => {
          // fire-and-forget; never block the response
        });
      }),
    );
  }
}

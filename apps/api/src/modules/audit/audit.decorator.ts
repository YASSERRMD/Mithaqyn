import { SetMetadata } from '@nestjs/common';
import { AUDIT_ACTION_KEY, AUDIT_ENTITY_KEY } from './audit.interceptor';

export const Audit = (action: string, entityType: string) => (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
  SetMetadata(AUDIT_ACTION_KEY, action)(target, key, descriptor);
  SetMetadata(AUDIT_ENTITY_KEY, entityType)(target, key, descriptor);
  return descriptor;
};

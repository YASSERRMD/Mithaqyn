import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'Mithaqyn API',
      version: '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}

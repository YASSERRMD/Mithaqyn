import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'Mithaqyn API',
      version: '1.0.0',
    };
  }
}

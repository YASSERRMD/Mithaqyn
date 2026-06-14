import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { CounterpartiesModule } from './modules/counterparties/counterparties.module';
import { AIModule } from './modules/ai/ai.module';
import { ClausesModule } from './modules/clauses/clauses.module';
import { RisksModule } from './modules/risks/risks.module';
import { ObligationsModule } from './modules/obligations/obligations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContractsModule,
    CounterpartiesModule,
    AIModule,
    ClausesModule,
    RisksModule,
    ObligationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

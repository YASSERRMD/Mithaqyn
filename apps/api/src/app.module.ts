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
import { RenewalsModule } from './modules/renewals/renewals.module';
import { ComparisonModule } from './modules/comparison/comparison.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { LifecycleModule } from './modules/lifecycle/lifecycle.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';
import { RagModule } from './modules/rag/rag.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { NegotiationModule } from './modules/negotiation/negotiation.module';
import { EsignatureModule } from './modules/esignature/esignature.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { FinancialModule } from './modules/financial/financial.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { JurisdictionModule } from './modules/jurisdiction/jurisdiction.module';
import { SlaModule } from './modules/sla/sla.module';
import { VersionsModule } from './modules/versions/versions.module';
import { PlaybookModule } from './modules/playbook/playbook.module';
import { ClauseLibraryModule } from './modules/clause-library/clause-library.module';

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
    RenewalsModule,
    ComparisonModule,
    DashboardModule,
    AuditModule,
    LifecycleModule,
    OcrModule,
    EmbeddingsModule,
    RagModule,
    ApprovalsModule,
    NegotiationModule,
    EsignatureModule,
    ProcurementModule,
    FinancialModule,
    PrivacyModule,
    JurisdictionModule,
    SlaModule,
    VersionsModule,
    PlaybookModule,
    ClauseLibraryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

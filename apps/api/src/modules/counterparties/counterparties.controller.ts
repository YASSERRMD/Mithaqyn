import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CounterpartiesService, CreateCounterpartyDto } from './counterparties.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('counterparties')
@Controller('counterparties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CounterpartiesController {
  constructor(private readonly svc: CounterpartiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a counterparty' })
  create(@Body() dto: CreateCounterpartyDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List counterparties' })
  findAll(@Query('search') search?: string) {
    return this.svc.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }
}

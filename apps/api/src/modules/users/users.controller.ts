import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'LEGAL_ADMIN')
  @ApiOperation({ summary: 'List all users' })
  findAll(@CurrentUser() user: { role: UserRole }) {
    return this.usersService.findAll(user.role);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'LEGAL_ADMIN', 'CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/role')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user role (Super Admin only)' })
  updateRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.updateRole(id, body.role, user.id);
  }

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN', 'LEGAL_ADMIN')
  @ApiOperation({ summary: 'Deactivate a user' })
  deactivate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.usersService.deactivate(id, user.id);
  }
}

import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { User } from '../models/user.model';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersQueryDto, UpdateAdminUserDto } from './dto/admin-users.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll(@Query() query: AdminUsersQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') userId: string) {
    return this.adminUsersService.findOne(userId);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: User,
    @Param('id') userId: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminUsersService.update(actor.id, userId, dto);
  }
}

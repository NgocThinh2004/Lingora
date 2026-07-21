import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RefreshToken } from '../auth/models/refresh-token.model';
import { AdminUsersController } from './admin/admin-users.controller';
import { AdminUsersService } from './admin/admin-users.service';
import { Role } from './models/role.model';
import { User } from './models/user.model';
import { UsersService } from './users.service';

@Module({
  imports: [SequelizeModule.forFeature([User, Role, RefreshToken])],
  controllers: [AdminUsersController],
  providers: [UsersService, AdminUsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}

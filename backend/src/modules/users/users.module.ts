import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RefreshToken } from '../auth/models/refresh-token.model';
import { AdminUsersController } from './admin/admin-users.controller';
import { AdminUsersService } from './admin/admin-users.service';
import { PublicUsersController } from './public/public-users.controller';
import { PublicUsersService } from './public/public-users.service';
import { Role } from './models/role.model';
import { User } from './models/user.model';
import { UsersService } from './users.service';
import { Subscription } from '../subscriptions/models/subscription.model';

@Module({
  imports: [SequelizeModule.forFeature([User, Role, RefreshToken, Subscription])],
  controllers: [AdminUsersController, PublicUsersController],
  providers: [UsersService, AdminUsersService, PublicUsersService, RolesGuard],
  exports: [UsersService, PublicUsersService],
})
export class UsersModule {}

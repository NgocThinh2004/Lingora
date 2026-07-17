import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersService } from './users.service';
import { User, Role } from '../../database/models';

@Module({
  imports: [SequelizeModule.forFeature([User, Role])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

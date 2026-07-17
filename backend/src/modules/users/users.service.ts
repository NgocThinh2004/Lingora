import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User, Role } from '../../database/models';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Role)
    private roleModel: typeof Role,
  ) {}

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.userModel.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername },
        ],
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findByPk(id);
  }
  
  async getRoleByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ where: { name } });
  }

  async create(userData: Partial<User>): Promise<User> {
    return this.userModel.create(userData as any);
  }
}

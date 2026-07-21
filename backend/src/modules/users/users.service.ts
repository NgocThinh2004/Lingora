import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
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

  async findById(id: string, transaction?: Transaction): Promise<User | null> {
    return this.userModel.findByPk(id, { transaction });
  }

  async findByIdForUpdate(id: string, transaction: Transaction): Promise<User | null> {
    return this.userModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async findByEmailForUpdate(email: string, transaction: Transaction): Promise<User | null> {
    return this.userModel.findOne({
      where: { email: email.toLowerCase() },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async clearPasswordResetOtp(userId: string, expectedOtpHash: string): Promise<void> {
    await this.userModel.update(
      {
        password_reset_otp_hash: null,
        password_reset_expires_at: null,
        password_reset_attempts: 0,
        password_reset_sent_at: null,
        updated_at: new Date(),
      },
      {
        where: {
          id: userId,
          password_reset_otp_hash: expectedOtpHash,
        },
      },
    );
  }
  
  async getRoleByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ where: { name } });
  }

  async getRoleById(id: number, transaction?: Transaction): Promise<Role | null> {
    return this.roleModel.findByPk(id, { transaction });
  }

  async create(userData: Partial<User>): Promise<User> {
    return this.userModel.create(userData as any);
  }
}

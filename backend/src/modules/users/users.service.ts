import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Role } from './models/role.model';
import { User } from './models/user.model';

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

  async findByUsername(username: string, transaction?: Transaction): Promise<User | null> {
    return this.userModel.findOne({ where: { username }, transaction });
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
        individualHooks: true,
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

  async getDashboardMetrics() {
    const [users, roles] = await Promise.all([
      this.userModel.findAll({
        attributes: ['role_id', 'status', 'created_at'],
        where: { deleted_at: null },
      }),
      this.roleModel.findAll({ attributes: ['id', 'name'] }),
    ]);
    const roleNames = new Map(roles.map(role => [role.id, role.name]));
    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const user of users) {
      const role = roleNames.get(user.role_id) ?? 'unknown';
      byRole[role] = (byRole[role] ?? 0) + 1;
      byStatus[user.status] = (byStatus[user.status] ?? 0) + 1;
    }

    return {
      total: users.length,
      byRole,
      byStatus,
      growth: this.buildDailySeries(users.map(user => user.created_at)),
    };
  }

  private buildDailySeries(dates: Date[], numberOfDays = 7) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = new Date(date).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from({ length: numberOfDays }, (_, index) => {
      const day = new Date(today);
      day.setUTCDate(today.getUTCDate() - (numberOfDays - 1 - index));
      const date = day.toISOString().slice(0, 10);
      return { date, count: counts.get(date) ?? 0 };
    });
  }
}

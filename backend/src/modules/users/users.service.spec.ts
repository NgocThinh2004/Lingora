import { Op } from 'sequelize';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('normalizes email when finding a user by email or username', async () => {
    const userModel = { findOne: jest.fn().mockResolvedValue(null) };
    const roleModel = {};
    const service = new UsersService(userModel as never, roleModel as never);

    await service.findByEmailOrUsername('Member@Example.COM');

    expect(userModel.findOne).toHaveBeenCalledWith({
      where: {
        [Op.or]: [
          { email: 'member@example.com' },
          { username: 'Member@Example.COM' },
        ],
      },
    });
  });

  it('locks the user row while creating a password reset OTP', async () => {
    const userModel = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new UsersService(userModel as never, {} as never);
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };

    await service.findByEmailForUpdate('Member@Example.COM', transaction as never);

    expect(userModel.findOne).toHaveBeenCalledWith({
      where: { email: 'member@example.com' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  });

  it('locks the authenticated user row while changing a password', async () => {
    const userModel = { findByPk: jest.fn().mockResolvedValue(null) };
    const service = new UsersService(userModel as never, {} as never);
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };

    await service.findByIdForUpdate('7', transaction as never);

    expect(userModel.findByPk).toHaveBeenCalledWith('7', {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  });
});

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
});

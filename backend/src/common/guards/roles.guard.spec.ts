import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(),
  } as unknown as ExecutionContext;

  it('allows an authenticated user whose current database role is required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const usersService = {
      getRoleById: jest.fn().mockResolvedValue({ name: 'admin' }),
    };
    (context.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => ({ user: { role_id: 1 } }),
    });

    const guard = new RolesGuard(reflector, usersService as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a user whose current database role is not required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const usersService = {
      getRoleById: jest.fn().mockResolvedValue({ name: 'member' }),
    };
    (context.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => ({ user: { role_id: 2 } }),
    });

    const guard = new RolesGuard(reflector, usersService as never);

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
});

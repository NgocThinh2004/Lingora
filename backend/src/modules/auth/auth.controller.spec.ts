import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('passes the normalized forgot-password email to the service', async () => {
    const authService = {
      forgotPassword: jest.fn().mockResolvedValue({ message: 'Request accepted' }),
    };
    const controller = new AuthController(authService as never);

    await controller.forgotPassword({ email: 'member@example.com' });

    expect(authService.forgotPassword).toHaveBeenCalledWith('member@example.com');
  });

  it('passes reset-password input to the service', async () => {
    const authService = {
      resetPassword: jest.fn().mockResolvedValue({ message: 'Password reset successfully' }),
    };
    const controller = new AuthController(authService as never);
    const dto = {
      email: 'member@example.com',
      otp: '123456',
      newPassword: 'new-password-123',
    };

    await controller.resetPassword(dto);

    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('passes the authenticated user and change-password input to the service', async () => {
    const authService = {
      changePassword: jest.fn().mockResolvedValue({ message: 'Password changed successfully' }),
    };
    const controller = new AuthController(authService as never);
    const user = { id: '7' };
    const dto = {
      currentPassword: 'current-password',
      newPassword: 'new-password-123',
    };

    await controller.changePassword(user as never, dto);

    expect(authService.changePassword).toHaveBeenCalledWith(user.id, dto);
  });

  it('passes refresh token and request metadata to the service', async () => {
    const authService = {
      refresh: jest.fn().mockResolvedValue({ accessToken: 'new-access-token' }),
    };
    const controller = new AuthController(authService as never);
    const request = {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('PostmanRuntime/7'),
    };

    await controller.refresh(
      { refreshToken: 'refresh-token' },
      request as never,
    );

    expect(authService.refresh).toHaveBeenCalledWith('refresh-token', {
      deviceInfo: 'PostmanRuntime/7',
      ipAddress: '203.0.113.10',
    });
  });
});

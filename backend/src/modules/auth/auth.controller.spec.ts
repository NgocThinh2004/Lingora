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

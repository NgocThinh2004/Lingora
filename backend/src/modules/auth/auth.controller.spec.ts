import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const createController = (authService: Record<string, unknown>) =>
    new AuthController(
      authService as never,
      {
        get: jest.fn((key: string, fallback?: string) => {
          const values: Record<string, string> = {
            NODE_ENV: 'production',
            API_PREFIX: 'api/v1',
            REFRESH_TOKEN_TTL: '7d',
          };
          return values[key] ?? fallback;
        }),
      } as never,
    );

  const createResponse = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  it('passes the normalized forgot-password email to the service', async () => {
    const authService = {
      forgotPassword: jest.fn().mockResolvedValue({ message: 'Request accepted' }),
    };
    const controller = createController(authService);

    await controller.forgotPassword({ email: 'member@example.com' });

    expect(authService.forgotPassword).toHaveBeenCalledWith('member@example.com');
  });

  it('passes reset-password input to the service', async () => {
    const authService = {
      resetPassword: jest.fn().mockResolvedValue({ message: 'Password reset successfully' }),
    };
    const controller = createController(authService);
    const response = createResponse();
    const dto = {
      email: 'member@example.com',
      otp: '123456',
      newPassword: 'new-password-123',
    };

    await controller.resetPassword(dto, response as never);

    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'lingora_refresh',
      expect.objectContaining({ httpOnly: true, secure: true, path: '/api/v1/auth' }),
    );
  });

  it('passes the authenticated user and change-password input to the service', async () => {
    const authService = {
      changePassword: jest.fn().mockResolvedValue({ message: 'Password changed successfully' }),
    };
    const controller = createController(authService);
    const response = createResponse();
    const user = { id: '7' };
    const dto = {
      currentPassword: 'current-password',
      newPassword: 'new-password-123',
    };

    await controller.changePassword(user as never, dto, response as never);

    expect(authService.changePassword).toHaveBeenCalledWith(user.id, dto);
    expect(response.clearCookie).toHaveBeenCalled();
  });

  it('rotates the refresh cookie without exposing it in the response body', async () => {
    const authService = {
      refresh: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: '7' },
      }),
    };
    const controller = createController(authService);
    const response = createResponse();
    const request = {
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        cookie: 'lingora_refresh=refresh-token',
      },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('PostmanRuntime/7'),
    };

    const result = await controller.refresh(
      request as never,
      response as never,
    );

    expect(authService.refresh).toHaveBeenCalledWith('refresh-token', {
      deviceInfo: 'PostmanRuntime/7',
      ipAddress: '203.0.113.10',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'lingora_refresh',
      'new-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(result).toEqual({ accessToken: 'new-access-token', user: { id: '7' } });
  });

  it('clears the cookie even when logout has no active refresh session', async () => {
    const authService = { logout: jest.fn() };
    const controller = createController(authService);
    const response = createResponse();
    const request = { headers: {}, get: jest.fn() };

    await expect(controller.logout(request as never, response as never)).resolves.toEqual({
      message: 'Logged out successfully',
    });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalled();
  });

  it('clears an invalid refresh cookie when rotation fails', async () => {
    const authService = {
      refresh: jest.fn().mockRejectedValue(new Error('Invalid refresh token')),
    };
    const controller = createController(authService);
    const response = createResponse();
    const request = {
      headers: { cookie: 'lingora_refresh=invalid-token' },
      get: jest.fn(),
    };

    await expect(
      controller.refresh(request as never, response as never),
    ).rejects.toThrow('Invalid refresh token');

    expect(response.clearCookie).toHaveBeenCalledWith(
      'lingora_refresh',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
  });
});

import { validate } from 'class-validator';
import { ChangePasswordDto, RegisterDto, ResetPasswordDto } from './auth.dto';

describe('authentication password policy', () => {
  it.each([
    Object.assign(new RegisterDto(), {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'StrongPass1!',
    }),
    Object.assign(new ResetPasswordDto(), {
      email: 'test@example.com',
      otp: '123456',
      newPassword: 'StrongPass1!',
    }),
    Object.assign(new ChangePasswordDto(), {
      currentPassword: 'old-password',
      newPassword: 'StrongPass1!',
    }),
  ])('accepts a strong password for every password-writing endpoint', async dto => {
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['short', 'lowercase1!', 'UPPERCASE1!', 'NoNumber!', 'NoSpecial1', 'Has Space1!', `Aa1!${'😀'.repeat(18)}`])(
    'rejects weak password %s',
    async newPassword => {
      const dto = Object.assign(new ChangePasswordDto(), {
        currentPassword: 'old-password',
        newPassword,
      });

      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'newPassword')).toBe(true);
    },
  );
});

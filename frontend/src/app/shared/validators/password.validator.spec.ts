import { FormControl } from '@angular/forms';
import { isStrongPassword, strongPasswordValidator } from './password.validator';

describe('password policy', () => {
  it('accepts a password that meets every requirement', () => {
    expect(isStrongPassword('StrongPass1!')).toBeTrue();
    expect(strongPasswordValidator(new FormControl('StrongPass1!'))).toBeNull();
  });

  it('rejects missing character classes, spaces, and excessive length', () => {
    expect(isStrongPassword('lowercase1!')).toBeFalse();
    expect(isStrongPassword('UPPERCASE1!')).toBeFalse();
    expect(isStrongPassword('NoNumber!')).toBeFalse();
    expect(isStrongPassword('NoSpecial1')).toBeFalse();
    expect(isStrongPassword('Has Space1!')).toBeFalse();
    expect(isStrongPassword(`Aa1!${'x'.repeat(69)}`)).toBeFalse();
    expect(isStrongPassword(`Aa1!${'😀'.repeat(18)}`)).toBeFalse();
  });
});

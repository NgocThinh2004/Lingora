import { CurrentUser } from '../../../core/auth/current-user.model';
import { resolvePostLoginUrl } from './login.component';

describe('resolvePostLoginUrl', () => {
  const member: CurrentUser = {
    id: '2',
    email: 'member@example.com',
    username: 'member',
    displayName: 'Member',
    role: 'member',
  };

  it('always sends an admin to the admin dashboard', () => {
    expect(resolvePostLoginUrl({ ...member, role: 'admin' }, '/subscriptions')).toBe('/admin');
  });

  it('returns a member to a safe requested page', () => {
    expect(resolvePostLoginUrl(member, '/subscriptions')).toBe('/subscriptions');
  });

  it('sends a member home when the return URL is unsafe or missing', () => {
    expect(resolvePostLoginUrl(member, '//example.com')).toBe('/');
    expect(resolvePostLoginUrl(member, null)).toBe('/');
  });
});

import { NotFoundException } from '@nestjs/common';
import { PublicUsersService } from './public-users.service';

describe('PublicUsersService', () => {
  const profile = {
    id: '7',
    username: 'author7',
    display_name: 'Author Seven',
    avatar: '/uploads/avatar.png',
    bio: 'Public bio',
    role_id: 2,
    accent_color: '#22CC88',
    background_color: '#101820',
  };

  it('returns the requested public profile with branding and relationship counts', async () => {
    const userModel = { findOne: jest.fn().mockResolvedValue(profile) };
    const subscriptionModel = {
      count: jest.fn()
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(4),
    };
    const service = new PublicUsersService(userModel as never, subscriptionModel as never);

    await expect(service.getProfile(7)).resolves.toEqual(expect.objectContaining({
      id: 7,
      name: 'Author Seven',
      handle: 'author7',
      accentColor: '#22CC88',
      backgroundColor: '#101820',
      followersCount: 12,
      followingCount: 4,
    }));
    expect(userModel.findOne).toHaveBeenCalledWith({
      where: { id: 7, status: 'active', deleted_at: null },
    });
  });

  it('does not expose missing or inactive profiles', async () => {
    const service = new PublicUsersService(
      { findOne: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
    );

    await expect(service.getProfile(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});

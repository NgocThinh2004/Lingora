import { CategoriesCacheService } from './categories-cache.service';

describe('CategoriesCacheService', () => {
  it('returns a cached category response without loading the database', async () => {
    const cache = {
      get: jest.fn()
        .mockResolvedValueOnce(String(Date.now() + 1000))
        .mockResolvedValueOnce([{ id: 1 }]),
      set: jest.fn(),
    };
    const service = new CategoriesCacheService(cache as any);
    const loader = jest.fn();

    await expect(service.getOrLoad('list:all', loader)).resolves.toEqual([{ id: 1 }]);
    expect(loader).not.toHaveBeenCalled();
  });

  it('falls back to the database when Redis is unavailable', async () => {
    const cache = {
      get: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
      set: jest.fn(),
    };
    const service = new CategoriesCacheService(cache as any);
    const loader = jest.fn().mockResolvedValue([{ id: 2 }]);

    await expect(service.getOrLoad('list:all', loader)).resolves.toEqual([{ id: 2 }]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('changes the shared cache version when categories are mutated', async () => {
    const cache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CategoriesCacheService(cache as any);

    await service.invalidate();

    expect(cache.set).toHaveBeenCalledWith(
      'categories:version',
      expect.any(String),
      86_400_000,
    );
  });
});

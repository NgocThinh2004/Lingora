import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();
  const context = {} as ExecutionContext;

  const intercept = (value: unknown) =>
    firstValueFrom(interceptor.intercept(context, { handle: () => of(value) } as CallHandler));

  it('does not wrap an existing data envelope a second time', async () => {
    const response = { data: { id: '12', status: 'draft' } };

    await expect(intercept(response)).resolves.toEqual(response);
  });

  it('preserves an existing collection envelope', async () => {
    const response = {
      data: [{ id: '12' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };

    await expect(intercept(response)).resolves.toEqual(response);
  });

  it('wraps raw response values once', async () => {
    await expect(intercept({ id: '12' })).resolves.toEqual({ data: { id: '12' } });
  });
});

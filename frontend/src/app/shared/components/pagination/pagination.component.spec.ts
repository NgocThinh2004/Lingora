import { buildPaginationItems } from './pagination.component';

describe('buildPaginationItems', () => {
  it('shows the first, adjacent, current, and last pages with gaps', () => {
    expect(buildPaginationItems(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
  });

  it('does not add duplicate pages or unnecessary gaps at the start', () => {
    expect(buildPaginationItems(1, 10)).toEqual([1, 2, null, 10]);
  });

  it('does not add duplicate pages or unnecessary gaps at the end', () => {
    expect(buildPaginationItems(10, 10)).toEqual([1, null, 9, 10]);
  });

  it('shows every page when all pages fit the shared pattern', () => {
    expect(buildPaginationItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

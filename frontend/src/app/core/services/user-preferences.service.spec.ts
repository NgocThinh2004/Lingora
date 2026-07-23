import { TestBed } from '@angular/core/testing';
import { UserPreferencesService } from './user-preferences.service';

describe('UserPreferencesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('uses the expected defaults when no preferences were saved', () => {
    const service = TestBed.inject(UserPreferencesService);

    expect(service.preferences()).toEqual({
      compactView: false,
      autoPlayMedia: true,
      showSubscribers: true,
      showFollowing: true,
    });
  });

  it('updates its signal and persists the complete preference set', () => {
    const service = TestBed.inject(UserPreferencesService);

    service.update('compactView', true);

    expect(service.preferences().compactView).toBeTrue();
    expect(JSON.parse(localStorage.getItem('lingora-user-preferences') ?? '{}')).toEqual(
      service.preferences(),
    );
  });

  it('restores saved preferences while retaining defaults for missing fields', () => {
    localStorage.setItem('lingora-user-preferences', JSON.stringify({ autoPlayMedia: false }));

    const service = TestBed.inject(UserPreferencesService);

    expect(service.preferences()).toEqual({
      compactView: false,
      autoPlayMedia: false,
      showSubscribers: true,
      showFollowing: true,
    });
  });
});

export interface UserPreferences {
  compactView: boolean;
  autoPlayMedia: boolean;
  showSubscribers: boolean;
  showFollowing: boolean;
}

export type UserPreferenceKey = keyof UserPreferences;

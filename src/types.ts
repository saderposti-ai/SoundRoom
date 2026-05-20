export type MoodType =
  | 'studying'
  | 'relaxing'
  | 'sad'
  | 'overthinking'
  | 'cozy'
  | 'sleepy'
  | 'productive'
  | 'lonely'
  | 'vibing';

export type RoomThemeId = 'rainy' | 'cafe' | 'latenight' | 'nature' | 'storm' | 'dreamy';

export type SoundId =
  | 'rain'
  | 'keyboard'
  | 'cafe'
  | 'thunder'
  | 'fireplace'
  | 'city'
  | 'train'
  | 'vinyl'
  | 'birds'
  | 'ocean'
  | 'white_noise'
  | 'soft_music';

export interface SoundDefinition {
  id: SoundId;
  label: string;
  emoji: string;
  description: string;
  category: 'nature' | 'urban' | 'noise' | 'music';
}

export interface PresenceOrb {
  id: string;
  mood: MoodType;
  country: string;
  activeSounds: string[];
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  lastActive: number;
}

export interface RoomState {
  roomId: string;
  userCount: number;
  moodCounts: Record<MoodType, number>;
  activeSounds: Record<SoundId, number>; // Maps SoundId to count of users playing it
}

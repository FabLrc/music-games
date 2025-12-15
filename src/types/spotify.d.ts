// Spotify Web Playback SDK types
interface Window {
  onSpotifyWebPlaybackSDKReady: () => void;
  Spotify: typeof Spotify;
}

// Game types
type GameSource = "playlist" | "album" | "liked" | "random";

interface GameConfig {
  source: GameSource;
  sourceId?: string; // playlist or album ID
  trackCount: number;
}

interface GameResult {
  trackName: string;
  artist: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
}

declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(
      event: string,
      callback: (data: unknown) => void
    ): void;
    removeListener(event: string): void;
    getCurrentState(): Promise<PlaybackState | null>;
    setName(name: string): void;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
  }

  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: Track;
    };
  }

  interface Track {
    uri: string;
    id: string;
    name: string;
    artists: Array<{ name: string; uri: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
  }

  interface PlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }
}

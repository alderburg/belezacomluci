interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady: () => void;
}

declare namespace YT {
  class Player {
    constructor(elementId: HTMLElement | string, options: PlayerOptions);
    destroy(): void;
    getCurrentTime(): number;
    getDuration(): number;
    pauseVideo(): void;
    playVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
  }

  interface PlayerOptions {
    videoId: string;
    playerVars?: PlayerVars;
    events?: PlayerEvents;
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    enablejsapi?: 0 | 1;
  }

  interface PlayerEvents {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
  }

  interface PlayerEvent {
    target: Player;
    data?: number;
  }
}

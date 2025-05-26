
export class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.3;

  private constructor() {
    this.loadSounds();
    this.loadPreferences();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private loadSounds() {
    const soundFiles = {
      'typewriter-key': '/sounds/typewriter-key.mp3',
      'typewriter-bell': '/sounds/typewriter-bell.mp3',
      'message-sent': '/sounds/message-sent.mp3',
      'message-received': '/sounds/message-received.mp3',
      'complete': '/sounds/complete.mp3'
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    });
  }

  private loadPreferences() {
    const saved = localStorage.getItem('soundPreferences');
    if (saved) {
      const { enabled, volume } = JSON.parse(saved);
      this.enabled = enabled ?? true;
      this.volume = volume ?? 0.3;
      this.updateVolume();
    }
  }

  savePreferences() {
    localStorage.setItem('soundPreferences', JSON.stringify({
      enabled: this.enabled,
      volume: this.volume
    }));
  }

  play(soundKey: string) {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundKey);
    if (sound) {
      // Clone and play to allow overlapping sounds
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = this.volume;
      clone.play().catch(err => {
        console.warn('Sound play failed:', err);
      });
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.savePreferences();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateVolume();
    this.savePreferences();
  }

  private updateVolume() {
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  isEnabled() {
    return this.enabled;
  }

  getVolume() {
    return this.volume;
  }
}

// Notification sound types
export type NotificationSoundType = 'default' | 'chime' | 'bell' | 'pop';
export type ExtendedSoundType = NotificationSoundType | 'peel' | 'slap' | 'crumple' | 'whoosh';

// Create audio context for Web Audio API
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate different notification sounds using Web Audio API
const generateSound = (type: NotificationSoundType, volume: number) => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Set volume
  gainNode.gain.value = volume;
  
  const now = ctx.currentTime;
  
  switch (type) {
    case 'chime':
      // Pleasant chime sound (C-E-G chord)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      break;
      
    case 'bell':
      // Bell-like sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      break;
      
    case 'pop':
      // Quick pop sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      break;
      
    default: // 'default'
      // Simple notification beep
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, now); // A4
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  }
  
  oscillator.start(now);
  oscillator.stop(now + 0.5);
};

// Generate extended sounds for gamification
const generateExtendedSound = (type: ExtendedSoundType, volume: number) => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  gainNode.gain.value = volume;
  const now = ctx.currentTime;
  
  switch (type) {
    case 'peel':
      // Soft peeling sound - low frequency sweep
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;
    
    case 'slap':
      // Quick tap sound
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(200, now);
      gainNode.gain.setValueAtTime(volume * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      oscillator.start(now);
      oscillator.stop(now + 0.08);
      break;
    
    case 'crumple':
      // Crumpling paper sound
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, now);
      gainNode.gain.setValueAtTime(volume * 0.2, now);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
      break;
    
    case 'whoosh':
      // Swoosh sound for drag
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.2);
      gainNode.gain.setValueAtTime(volume * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;
    
    default:
      generateSound(type as NotificationSoundType, volume);
      return;
  }
};

// Play notification sound
export const playNotificationSound = (
  type: ExtendedSoundType = 'default',
  volume: number = 0.7
) => {
  try {
    const safeVolume = Math.max(0, Math.min(1, volume));
    if (['peel', 'slap', 'crumple', 'whoosh'].includes(type)) {
      generateExtendedSound(type as ExtendedSoundType, safeVolume);
    } else {
      generateSound(type as NotificationSoundType, safeVolume);
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Test sound (for preferences)
export const testSound = (type: NotificationSoundType, volume: number) => {
  playNotificationSound(type, volume);
};

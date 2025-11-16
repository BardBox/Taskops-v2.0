import confetti from 'canvas-confetti';

export const triggerConfetti = (urgency: string) => {
  const urgencyLower = urgency.toLowerCase();
  
  if (urgencyLower.includes('high') || urgencyLower.includes('urgent') || urgencyLower.includes('critical')) {
    // Big celebration for urgent tasks
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  } else if (urgencyLower.includes('medium') || urgencyLower.includes('moderate')) {
    // Medium celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 10000,
    });
  } else {
    // Small celebration for low urgency
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 },
      zIndex: 10000,
    });
  }
};

export const triggerAchievementConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 160,
    origin: { y: 0.4 },
    colors: ['#FFD700', '#FFA500', '#FF6347', '#87CEEB', '#9370DB'],
    zIndex: 10000,
  });
};

export const triggerSparkles = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  confetti({
    particleCount: 20,
    spread: 30,
    origin: { x, y },
    colors: ['#FFD700', '#FFA500'],
    ticks: 50,
    gravity: 0.5,
    scalar: 0.8,
    zIndex: 10000,
  });
};

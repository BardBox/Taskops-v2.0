export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

export const isNotificationSupported = (): boolean => {
  return "Notification" in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.permission;
};

interface ShowNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const showBrowserNotification = async (
  options: ShowNotificationOptions
): Promise<Notification | null> => {
  if (!isNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/favicon.ico",
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      badge: "/favicon.ico",
    });

    // Auto-close after 5 seconds if not set to requireInteraction
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  } catch (error) {
    console.error("Error showing browser notification:", error);
    return null;
  }
};

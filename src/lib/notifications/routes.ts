export function resolveNotificationRoute(notification: {
  type: string;
  title: string;
  data?: Record<string, unknown>;
}): string {
  if (typeof notification.data?.route === "string") {
    return notification.data.route;
  }

  const title = notification.title.toLowerCase();

  if (title.includes("test sos")) {
    return "/safety/test-sos";
  }

  switch (notification.type) {
    case "emergency":
      return "/home";
    case "journey":
      return notification.data?.isGuardianMode
        ? "/safety/guardian"
        : "/safety/journey";
    case "checkin":
    case "reminder":
      return "/safety/checkin";
    case "fake_call":
      return "/safety/fake-call";
    case "system":
      return "/settings";
    default:
      return "/activity";
  }
}

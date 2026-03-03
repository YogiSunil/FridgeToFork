import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermission = async () => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleDailyMealReminder = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍳 FridgeToFork',
      body: "What's for dinner tonight? Scan your fridge for ideas!",
      sound: true,
    },
    trigger: {
      hour: 17,
      minute: 30,
      repeats: true,
    },
  });
};

export const sendBudgetAlert = async (spent, goal) => {
  const pct = Math.round((spent / goal) * 100);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Budget Alert',
      body: `You've used ${pct}% of your $${goal} food budget this month.`,
      sound: true,
    },
    trigger: null,
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
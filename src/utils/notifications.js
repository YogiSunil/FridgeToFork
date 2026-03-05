import Constants from 'expo-constants';

let notificationsModule = null;
let handlerInitialized = false;

const EXPO_GO_NOTIFICATION_MESSAGE =
  'Notifications are limited in Expo Go. Use a development build for full notification support.';

const isExpoGo = () => {
  const ownership = Constants?.appOwnership;
  const executionEnvironment = Constants?.executionEnvironment;
  return ownership === 'expo' || executionEnvironment === 'storeClient';
};

export const getNotificationsSupport = () => ({
  supported: !isExpoGo(),
  message: EXPO_GO_NOTIFICATION_MESSAGE,
});

const getNotifications = async () => {
  if (isExpoGo()) {
    return null;
  }
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
  }
  return notificationsModule;
};

const ensureHandler = async () => {
  if (handlerInitialized) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerInitialized = true;
};

export const requestNotificationPermission = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleDailyMealReminder = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  await ensureHandler();
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
  return true;
};

export const sendBudgetAlert = async (spent, goal) => {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  await ensureHandler();
  const pct = Math.round((spent / goal) * 100);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Budget Alert',
      body: `You've used ${pct}% of your $${goal} food budget this month.`,
      sound: true,
    },
    trigger: null,
  });
  return true;
};

export const cancelAllNotifications = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  return true;
};
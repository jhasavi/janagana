import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleEventReminder(eventId: string, eventName: string, eventDate: Date) {
  // Day before reminder
  const dayBefore = new Date(eventDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Event Tomorrow',
      body: `"${eventName}" is happening tomorrow at ${eventDate.toLocaleTimeString()}`,
      data: { eventId, type: 'event_reminder' },
    },
    trigger: dayBefore,
  });

  // 2 hours before reminder
  const twoHoursBefore = new Date(eventDate);
  twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Event Starting Soon',
      body: `"${eventName}" starts in 2 hours`,
      data: { eventId, type: 'event_soon' },
    },
    trigger: twoHoursBefore,
  });
}

export async function scheduleVolunteerShiftReminder(shiftId: string, shiftDate: Date) {
  const dayBefore = new Date(shiftDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Volunteer Shift Tomorrow',
      body: `Your volunteer shift is scheduled for tomorrow`,
      data: { shiftId, type: 'volunteer_reminder' },
    },
    trigger: dayBefore,
  });
}

export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // Show immediately
  });
}

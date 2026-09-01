import { db } from '../admin';
import { AppNotification, NotificationCategory } from '../types';

/**
 * Creates an in-app notification. This is the ONLY way notifications are
 * created (Firestore rules block client writes to the `notifications`
 * collection) - the client can only read its own and mark them as read.
 * Called from backend events (payment success, referral activation, etc.)
 * so users never see a fabricated system notification.
 *
 * Push delivery (Expo/FCM/APNs) is not wired up yet - see
 * PHASE_4_COMPLETION_REPORT.md for the credentials required before that can
 * be added safely (and without reintroducing the native crash from an
 * earlier phase caused by mishandling `firebase/messaging` on native).
 */
export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  category: NotificationCategory;
  actionUrl?: string;
}): Promise<AppNotification> {
  const id = db.collection('users').doc(input.userId).collection('notifications').doc().id;
  const notification: AppNotification = {
    id,
    userId: input.userId,
    title: input.title,
    body: input.body,
    category: input.category,
    isRead: false,
    actionUrl: input.actionUrl,
    createdAt: new Date().toISOString(),
  };
  await db.collection('users').doc(input.userId).collection('notifications').doc(id).set(notification);
  return notification;
}

import { supabase } from '../lib/supabase';

interface NotificationPayload {
  userId: string;
  actorId?: string | null;
  type: string;
  title: string;
  message?: string;
  referenceId?: string | null;
  referenceType?: string | null;
}

export async function createNotification({
  userId,
  actorId,
  type,
  title,
  message,
  referenceId,
  referenceType,
}: NotificationPayload) {
  if (!userId) return;

  // Khud ko notification nahi
  if (actorId && userId === actorId) {
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      actor_id: actorId || null,
      type,
      title,
      message: message || null,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      is_read: false,
    });

  if (error) {
    console.error('Notification error:', error);
  }
}
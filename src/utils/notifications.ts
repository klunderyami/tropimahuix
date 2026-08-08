import { supabase } from '../supabase';

export interface NotificationPayload {
  source: 'lead_web' | 'whatsapp' | 'system' | 'order' | 'chat';
  title: string;
  message: string;
  actionUrl?: string;
}

/**
 * Envía una notificación al sistema centralizado
 * Puede ser llamado desde el frontend o backend
 * 
 * @param payload - Datos de la notificación
 * @returns Promise con el resultado de la inserción
 */
export async function sendSystemNotification(payload: NotificationPayload) {
  try {
    const { data, error } = await supabase
      .from('system_notifications')
      .insert({
        source: payload.source,
        title: payload.title,
        message: payload.message,
        action_url: payload.actionUrl || null,
        status: 'unread',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending notification:', error);
      throw error;
    }

    console.log('✅ Notificación enviada:', data);
    return data;
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    throw error;
  }
}

/**
 * Envía una notificación desde el backend (servidor)
 * Usa el service_role key para bypass RLS
 * 
 * @param payload - Datos de la notificación
 * @returns Promise con el resultado
 */
export async function sendSystemNotificationFromServer(payload: NotificationPayload) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar notificación');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error al enviar notificación desde servidor:', error);
    throw error;
  }
}

// Helpers específicos por fuente
export const NotificationHelpers = {
  leadWeb: (title: string, message: string, actionUrl?: string) =>
    sendSystemNotification({ source: 'lead_web', title, message, actionUrl }),

  whatsapp: (title: string, message: string, actionUrl?: string) =>
    sendSystemNotification({ source: 'whatsapp', title, message, actionUrl }),

  system: (title: string, message: string, actionUrl?: string) =>
    sendSystemNotification({ source: 'system', title, message, actionUrl }),

  order: (title: string, message: string, actionUrl?: string) =>
    sendSystemNotification({ source: 'order', title, message, actionUrl }),

  chat: (title: string, message: string, actionUrl?: string) =>
    sendSystemNotification({ source: 'chat', title, message, actionUrl }),
};
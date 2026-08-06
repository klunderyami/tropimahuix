import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SystemNotification {
  id: string;
  source: 'reddit' | 'lead_web' | 'whatsapp' | 'system' | 'order' | 'chat';
  title: string;
  message: string;
  action_url: string | null;
  status: 'unread' | 'read';
  created_at: string;
  updated_at: string;
}

interface UseNotificationsReturn {
  notifications: SystemNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Marcar notificación como leída
  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('system_notifications')
        .update({ status: 'read' })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, status: 'read' } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Error al marcar como leída');
    }
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications
        .filter(n => n.status === 'unread')
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error: updateError } = await supabase
        .from('system_notifications')
        .update({ status: 'read' })
        .in('id', unreadIds);

      if (updateError) {
        throw updateError;
      }

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, status: 'read' }))
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
      setError(err instanceof Error ? err.message : 'Error al marcar todas como leídas');
    }
  }, [notifications]);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    loadNotifications();

    // Crear canal de suscripción
    const channelName = 'system-notifications-channel';
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_notifications',
        },
        (payload) => {
          console.log('Nueva notificación recibida:', payload.new);
          const newNotification = payload.new as SystemNotification;
          
          setNotifications(prev => [newNotification, ...prev]);
          
          // Mostrar notificación del navegador si está permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Tropicaña Admin', {
              body: newNotification.title,
              icon: '/vite.svg',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_notifications',
        },
        (payload) => {
          console.log('Notificación actualizada:', payload.new);
          const updatedNotification = payload.new as SystemNotification;
          
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a notificaciones en tiempo real');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal de notificaciones');
          setError('Error en la conexión de notificaciones');
        }
      });

    setChannel(newChannel);

    // Solicitar permiso para notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [loadNotifications]);

  // Contador de no leídos
  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications: loadNotifications,
  };
};
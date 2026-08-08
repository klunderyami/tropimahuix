import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SystemNotification } from '../hooks/useNotifications';

interface NotificationPanelProps {
  notifications: SystemNotification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onClose: () => void;
}

const sourceConfig: Record<string, { icon: string; label: string; color: string }> = {
  lead_web: { icon: '🌐', label: 'Lead Web', color: 'bg-blue-100 text-blue-800' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: 'bg-green-100 text-green-800' },
  system: { icon: '⚙️', label: 'Sistema', color: 'bg-gray-100 text-gray-800' },
  order: { icon: '📦', label: 'Pedido', color: 'bg-purple-100 text-purple-800' },
  chat: { icon: '💭', label: 'Chat', color: 'bg-pink-100 text-pink-800' },
};

export const NotificationPanel = ({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationPanelProps) => {
  const [filter, setFilter] = useState<string>('all');
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleNotificationClick = async (notification: SystemNotification) => {
    // Marcar como leída
    if (notification.status === 'unread') {
      await onMarkAsRead(notification.id);
    }

    // Navegar a la URL de acción si existe
    if (notification.action_url) {
      navigate(notification.action_url);
      handleClose();
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.source === filter);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-MX');
  };

  return (
    <div
      ref={panelRef}
      className={`absolute right-0 top-16 w-96 max-h-[600px] overflow-hidden bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 transition-all duration-200 ${
        isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-brown to-brand-brown/90 px-6 py-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="bg-brand-orange text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-brand-gold hover:text-white transition-colors"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              filter === 'all'
                ? 'bg-white text-brand-brown'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Todas
          </button>
          {Object.entries(sourceConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                filter === key
                  ? 'bg-white text-brand-brown'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {config.icon} {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="overflow-y-auto max-h-[500px]">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-orange border-t-transparent"></div>
            <p className="mt-3 text-sm text-stone-600">Cargando notificaciones...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-sm font-semibold text-stone-700">No hay notificaciones</p>
            <p className="text-xs text-stone-500 mt-1">
              {filter === 'all'
                ? 'Las notificaciones aparecerán aquí'
                : `No hay notificaciones de ${sourceConfig[filter]?.label || filter}`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredNotifications.map((notification) => {
              const sourceInfo = sourceConfig[notification.source] || sourceConfig.system;
              const isUnread = notification.status === 'unread';

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-stone-50 transition-colors cursor-pointer ${
                    isUnread ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icono de fuente */}
                    <div className="flex-shrink-0">
                      <div className="text-2xl">{sourceInfo.icon}</div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-bold truncate ${isUnread ? 'text-brand-brown' : 'text-stone-700'}`}>
                          {notification.title}
                        </h4>
                        {isUnread && (
                          <div className="flex-shrink-0 w-2 h-2 bg-brand-orange rounded-full mt-1"></div>
                        )}
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceInfo.color}`}>
                            {sourceInfo.label}
                          </span>
                          <span className="text-xs text-stone-400">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>

                        {notification.action_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(notification.action_url!);
                              handleClose();
                            }}
                            className="text-xs text-brand-orange hover:text-brand-brown font-semibold"
                          >
                            Ver →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-stone-200 px-6 py-3 bg-stone-50">
          <p className="text-xs text-center text-stone-500">
            Mostrando {filteredNotifications.length} de {notifications.length} notificaciones
          </p>
        </div>
      )}
    </div>
  );
};
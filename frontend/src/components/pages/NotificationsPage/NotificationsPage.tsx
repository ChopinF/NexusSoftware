import React, { useState, useMemo } from 'react';
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { useNotifications } from "../../../contexts/NotificationContext";
import { 
  Bell, Check, CheckCheck, Trash2, MessageSquare, ShoppingBag, AlertCircle 
} from "lucide-react";
import styles from './NotificationsPage.module.css'; 

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'order': return <ShoppingBag size={20} color="#60a5fa" />;
    case 'review': return <MessageSquare size={20} color="#facc15" />;
    case 'system': return <AlertCircle size={20} color="#a855f7" />;
    default: return <Bell size={20} color="#9ca3af" />;
  }
};

const NotificationsPage: React.FC = () => {
  const { 
    notifications, loading, unreadCount, 
    markAsRead, markAllAsRead, deleteNotification 
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => n.is_read === 0);
    return notifications;
  }, [notifications, filter]);

  const handleItemClick = (id: string, isRead: number) => {
    if (isRead === 0) markAsRead(id);
  };

  const handleMarkBtn = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const handleDeleteBtn = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  return (
    <MainTemplate>
      <div className={styles.container}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Notifications</h1>
            {unreadCount > 0 && <span className={styles.badgeCount}>{unreadCount}</span>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className={styles.markAllBtn}>
              <CheckCheck size={18} />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>

        {/* FILTERS */}
        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.activeFilter : ''}`} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'unread' ? styles.activeFilter : ''}`} 
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>

        {/* LIST */}
        <div className={styles.list}>
          {loading ? (
             <div className={styles.loader}>Loading...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className={styles.emptyState}>
              <Bell size={48} style={{margin: '0 auto', opacity: 0.5}} />
              <h3>No notifications</h3>
              <p>We'll notify you when something arrives.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => handleItemClick(notif.id, notif.is_read)}
                className={`${styles.card} ${notif.is_read === 0 ? styles.unread : ''}`}
              >
                <div className={styles.iconWrapper}>
                  <NotificationIcon type={notif.notification_type} />
                </div>
                <div className={styles.contentWrapper}>
                  <p className={styles.messageText}>{notif.message}</p>
                  <span className={styles.timeText}>{timeAgo(notif.created_at)}</span>
                </div>
                <div className={styles.actionsWrapper}>
                  {notif.is_read === 0 && (
                    <button onClick={(e) => handleMarkBtn(e, notif.id)} className={styles.actionBtn}>
                      <Check size={18} />
                    </button>
                  )}
                  <button onClick={(e) => handleDeleteBtn(e, notif.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainTemplate>
  );
};

export default NotificationsPage;
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { io, Socket } from "socket.io-client";
import { useUser } from "./UserContext";
import { type Notification } from '../types/Notification'; 
import { API_URL } from "../config";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_URL}/my-notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            setNotifications(data);
        }
      })
      .catch(err => console.error("Error fetching notifications:", err))
      .finally(() => setLoading(false));
  }, [token]);

  // 2. Socket Connection (ascultă evenimente live)
  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(API_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on("connect", () => {
      console.log("Socket Connected");
    });

    socket.on("new_notification", (newNotif: Notification) => {
      console.log("New notification received", newNotif);
      const incomingNotif = {
        ...newNotif,
        is_read: 0, 
        created_at: newNotif.created_at || new Date().toISOString()
      };

      setNotifications(prev => {
        const exists = prev.some(n => n.id === incomingNotif.id);
        if (exists) return prev;
        return [incomingNotif, ...prev];
      });
    });

    return () => {
      socket.off("new_notification");
      socket.disconnect();
    };
  }, [token]);

  // 3. Actions
  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    
    try {
      await fetch(`${API_URL}/notification/${id}/read`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { 
        console.error("Failed to mark as read:", e); 
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    try {
      await fetch(`${API_URL}/my-notifications/read-all`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error(e); }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`${API_URL}/notification/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      markAsRead, 
      markAllAsRead, 
      deleteNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
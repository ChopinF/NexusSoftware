export interface Notification {
  id: string;
  id_user: string;
  message: string;
  notification_type: 'order' | 'review' | 'payment' | 'system' | string;
  is_read: number;
  created_at: string;
}
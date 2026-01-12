import { v4 as uuid } from "uuid";
import { run, all, get } from "../utils/db.js";
import { getIO } from "../utils/socket.js";
import { validateNotification } from "../utils/helpers.js";

// Exporting this for internal use by other controllers
export async function sendNotificationController(userId, message, type) {
  const notificationId = uuid();
  const createdAt = new Date().toISOString();

  try {
    await run(
      `INSERT INTO notifications (id,id_user,message,notification_type,is_read,created_at) values (?,?,?,?,?,?)`,
      [notificationId, userId, message, type, false, createdAt]
    );

    try {
      const io = getIO();
      io.to(userId).emit("new_notification", {
        id: notificationId,
        id_user: userId,
        message,
        notification_type: type,
        is_read: false,
        created_at: createdAt,
      });
    } catch (socketError) {
      console.log("Could not send notication", socketError);
    }

    return notificationId;
  } catch (error) {
    throw error;
  }
}

export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const notifications = await all(
      `SELECT id, id_user, message, notification_type, is_read, created_at
      FROM notifications
      WHERE id_user = ?
      ORDER BY created_at DESC`,
      [userId]
    );
    res.json(notifications);
  } catch (e) {
    next(e);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.sub;

    const updated = await run(
      `UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND id_user = ?`,
      [notificationId, userId]
    );

    if (updated.changes === 0) {
      return res.status(404).json({
        error:
          "Notification not found or you do not have permission to update it.",
      });
    }

    res.status(200).json({ message: "Notification marked as read" });
  } catch (e) {
    next(e);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const updated = await run(
      `UPDATE notifications
      SET is_read = 1
      WHERE id_user = ? AND is_read = 0`,
      [userId]
    );

    res.status(200).json({
      message: "All unread notifications marked as read.",
      count: updated.changes,
    });
  } catch (e) {
    next(e);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const notification = req.body;
    notification.is_read = false;
    validateNotification(notification);
    const added = await run(
      `INSERT INTO notifications (id, id_user, message, notification_type, is_read, created_at) VALUES (?,?,?,?,?,?)`,
      [
        uuid(),
        notification.user,
        notification.message,
        notification.type,
        notification.is_read,
        notification.created_at,
      ]
    );
    res.json(added);
  } catch (e) {
    next(e);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.sub;

    const deleted = await run(
      `DELETE FROM notifications
      WHERE id=? and id_user= ?`,
      [notificationId, userId]
    );

    if (deleted.changes === 0) {
      return res.status(404).json({
        error:
          "Notification not found or you do not have permission to delete it.",
      });
    }

    return res
      .status(200)
      .json({ message: "Notification deleted successfully" });
  } catch (e) {
    next(e);
  }
};

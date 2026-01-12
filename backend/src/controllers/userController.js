import { v4 as uuid } from "uuid";
import { run, all, get } from "../utils/db.js";
import { sendNotificationController } from "./notificationController.js";

// GET /users
export const getUsers = async (_req, res, next) => {
  try {
    const rows = await all(
      "SELECT id, name, email, role, country, city FROM users ORDER BY name"
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

// PUT /user/profile
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.sub;
    const { name, email, country, city } = req.body;

    if (!name || !email || !country || !city) {
      return res.status(400).json({ error: "All fields are required." });
    }

    let avatarPath = null;
    if (req.file) {
      avatarPath = "/" + req.file.path.replace(/\\/g, "/");
    }

    if (avatarPath) {
      await run(
        `UPDATE users 
         SET name = ?, email = ?, country = ?, city = ?, avatarUrl = ? 
         WHERE id = ?`,
        [name, email, country, city, avatarPath, userId]
      );
    } else {
      await run(
        `UPDATE users 
         SET name = ?, email = ?, country = ?, city = ? 
         WHERE id = ?`,
        [name, email, country, city, userId]
      );
    }

    const updatedUser = await get(
      `SELECT id, name, email, role, country, city, karma, avatarUrl FROM users WHERE id = ?`,
      [userId]
    );

    res.json(updatedUser);
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      return res
        .status(409)
        .json({ error: "Email is already in use by another account." });
    }
    next(err);
  }
};

// GET /my-trusted-request
export const getMyTrustedRequest = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const request = await get(
      `
            SELECT id, status, created_at, pitch
            FROM trusted_requests 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `,
      [userId]
    );

    if (!request) {
      return res.status(200).json({});
    }

    res.json(request);
  } catch (e) {
    next(e);
  }
};

// POST /request-trusted
export const requestTrusted = async (req, res, next) => {
  try {
    const { pitch } = req.body;
    const userId = req.user.sub;

    if (req.user.role === "Trusted" || req.user.role === "Admin") {
      return res
        .status(400)
        .json({ error: "You are already a verified seller." });
    }

    const existing = await get(
      `SELECT 1 FROM trusted_requests WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );
    if (existing) {
      return res
        .status(400)
        .json({ error: "You already have a pending application." });
    }

    const requestId = uuid();
    await run(
      `INSERT INTO trusted_requests (id, user_id, pitch, status, created_at)
       VALUES (?, ?, ?, 'pending', datetime('now'))`,
      [requestId, userId, pitch]
    );

    const admins = await all(`SELECT id FROM users WHERE role = 'Admin'`);

    const user = await get(`SELECT name FROM users WHERE id = ?`, [userId]);
    const userName = user ? user.name : "A user";

    if (admins.length > 0) {
      const notificationPromises = admins.map((admin) =>
        sendNotificationController(
          admin.id,
          `${userName} has requested to become a Trusted Seller.`,
          "system"
        )
      );
      await Promise.all(notificationPromises);
    }

    res.status(201).json({ message: "Application submitted successfully" });
  } catch (e) {
    next(e);
  }
};

// GET /admin/requests
export const getAdminRequests = async (req, res, next) => {
  try {
    const requests = await all(`
      SELECT tr.id, tr.pitch, tr.created_at, u.name, u.email, u.id as user_id, u.karma
      FROM trusted_requests tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.status = 'pending'
      ORDER BY tr.created_at ASC
    `);
    res.json(requests);
  } catch (e) {
    next(e);
  }
};

// POST /admin/request/:id/:action
export const handleAdminRequest = async (req, res, next) => {
  try {
    const { id, action } = req.params;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const request = await get(
      `SELECT user_id FROM trusted_requests WHERE id = ?`,
      [id]
    );
    if (!request) return res.status(404).json({ error: "Request not found" });

    const status = action === "approve" ? "approved" : "rejected";

    await run(`UPDATE trusted_requests SET status = ? WHERE id = ?`, [
      status,
      id,
    ]);

    if (action === "approve") {
      await run(`UPDATE users SET role = 'Trusted' WHERE id = ?`, [
        request.user_id,
      ]);

      await sendNotificationController(
        request.user_id,
        "Congratulations! Your request for Trusted status has been approved.",
        "system"
      );
    } else {
      await sendNotificationController(
        request.user_id,
        "Your request for Trusted status has been rejected.",
        "system"
      );
    }

    res.json({ message: `Request ${status}` });
  } catch (e) {
    next(e);
  }
};

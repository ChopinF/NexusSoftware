import { v4 as uuid } from "uuid";
import { run, all, get } from "../utils/db.js";
import { getIO } from "../utils/socket.js";

async function sendNotification(userId, message, type) {
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
      console.log("Could not send notification", socketError);
    }

    return notificationId;
  } catch (error) {
    throw error;
  }
}

export const getNegotiations = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const negotiations = await all(
      `SELECT 
        n.*,
        p.title as product_title,
        p.imageUrl as product_image,
        u_buyer.email as buyer_email,
        u_seller.email as seller_email
       FROM negotiations n
       JOIN products p ON n.product_id = p.id
       JOIN users u_buyer ON n.buyer_id = u_buyer.id
       JOIN users u_seller ON n.seller_id = u_seller.id
       WHERE n.buyer_id = ? OR n.seller_id = ?
       ORDER BY n.created_at DESC`,
      [userId, userId]
    );

    res.json(negotiations);
  } catch (e) {
    next(e);
  }
};

export const createNegotiation = async (req, res, next) => {
  try {
    const { productId, offeredPrice, quantity = 1 } = req.body;
    const buyerId = req.user.sub;
    const qty = parseInt(quantity);

    if (qty < 1)
      return res.status(400).json({ error: "Cantitatea minimă este 1" });

    const product = await get(
      `SELECT seller, stock, status FROM products WHERE id = ?`,
      [productId]
    );
    if (!product) return res.status(404).json({ error: "Produsul nu există" });
    if (product.status !== "ACTIVE")
      return res.status(400).json({ error: "Produs indisponibil" });

    if (product.stock < qty)
      return res
        .status(400)
        .json({
          error: `Stoc insuficient. Doar ${product.stock} disponibile.`,
        });

    if (product.seller === buyerId)
      return res.status(400).json({ error: "Nu poți negocia propriul produs" });

    const negId = uuid();
    await run(
      `INSERT INTO negotiations (id, product_id, buyer_id, seller_id, offered_price, quantity, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [negId, productId, buyerId, product.seller, offeredPrice, qty]
    );

    res.status(201).json({ message: "Offer sent", id: negId });
  } catch (e) {
    next(e);
  }
};

export const getNegotiationDetails = async (req, res, next) => {
  try {
    const { productId, negotiationId } = req.query;
    const buyerId = req.user.sub;

    let negotiation = null;

    if (negotiationId) {
      negotiation = await get(
        `SELECT id, offered_price, quantity, status 
         FROM negotiations 
         WHERE id = ? AND buyer_id = ?`,
        [negotiationId, buyerId]
      );
    } else if (productId) {
      negotiation = await get(
        `SELECT id, offered_price, quantity, status 
         FROM negotiations 
         WHERE product_id = ? AND buyer_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [productId, buyerId]
      );
    } else {
      return res
        .status(400)
        .json({ error: "Lipsesc parametrii (productId sau negotiationId)" });
    }

    if (!negotiation) {
      return res.status(200).json(null);
    }

    res.json({
      negotiationId: negotiation.id,
      price: negotiation.offered_price,
      quantity: negotiation.quantity,
      status: negotiation.status,
    });
  } catch (e) {
    next(e);
  }
};

export const acceptNegotiation = async (req, res, next) => {
  try {
    const negotiationId = req.params.id;
    const sellerId = req.user.sub;

    const data = await get(
      `
        SELECT 
            n.id, n.seller_id, n.buyer_id, n.quantity, n.offered_price,
            p.stock, p.status as product_status, p.title
        FROM negotiations n
        JOIN products p ON n.product_id = p.id
        WHERE n.id = ?
    `,
      [negotiationId]
    );

    if (!data) return res.status(404).json({ error: "Negociere inexistentă" });
    if (data.seller_id !== sellerId)
      return res.status(403).json({ error: "Nu ești vânzătorul produsului" });

    if (data.product_status !== "ACTIVE") {
      return res
        .status(400)
        .json({
          error: "Produsul nu mai este activ (a fost șters sau arhivat).",
        });
    }

    if (data.stock < data.quantity) {
      return res.status(400).json({
        error: `Stoc insuficient! Oferta este pentru ${data.quantity} buc, dar stocul actual este ${data.stock}.`,
      });
    }

    await run(`UPDATE negotiations SET status = 'ACCEPTED' WHERE id = ?`, [
      negotiationId,
    ]);

    await sendNotification(
      data.buyer_id,
      `Great news! Your offer for "${data.title}" was accepted. Go to 'Offers' to complete the order.`,
      "deal"
    );

    res.json({ message: "Ofertă acceptată.", status: "ACCEPTED" });
  } catch (e) {
    next(e);
  }
};

export const declineNegotiation = async (req, res, next) => {
  try {
    const negotiationId = req.params.id;
    const sellerId = req.user.sub;

    const negotiation = await get(`SELECT * FROM negotiations WHERE id = ?`, [
      negotiationId,
    ]);
    if (!negotiation)
      return res.status(404).json({ error: "Negociere inexistentă" });
    if (negotiation.seller_id !== sellerId)
      return res.status(403).json({ error: "Nu ești vânzătorul produsului" });

    await run(`UPDATE negotiations SET status = 'REJECTED' WHERE id = ?`, [
      negotiationId,
    ]);

    res.json({ message: "Ofertă respinsă.", status: "REJECTED" });
  } catch (e) {
    next(e);
  }
};

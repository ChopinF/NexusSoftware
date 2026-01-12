import { v4 as uuid } from "uuid";
import { run, all, get } from "../utils/db.js";
import { getIO } from "../utils/socket.js";
import { validateOrder } from "../utils/helpers.js";

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

export const createOrder = async (req, res, next) => {
  try {
    // Folosim validatorul aici
    validateOrder(req.body);

    const { productId, shipping_address, negotiationId, quantity } = req.body;
    const buyerId = req.user.sub;

    let finalUnitPrice = 0;
    let finalQuantity = parseInt(quantity || 1);

    if (negotiationId) {
      const negotiation = await get(`SELECT * FROM negotiations WHERE id = ?`, [
        negotiationId,
      ]);

      if (!negotiation)
        return res.status(404).json({ error: "Negociere invalidă" });
      if (negotiation.buyer_id !== buyerId)
        return res.status(403).json({ error: "Nu e negocierea ta" });
      if (negotiation.status !== "ACCEPTED")
        return res
          .status(400)
          .json({ error: "Oferta nu a fost acceptată încă" });

      finalUnitPrice = negotiation.offered_price;
      finalQuantity = negotiation.quantity;

      await run(`UPDATE negotiations SET status = 'ORDERED' WHERE id = ?`, [
        negotiationId,
      ]);
    } else {
      const product = await get(`SELECT price FROM products WHERE id = ?`, [
        productId,
      ]);
      if (!product)
        return res.status(404).json({ error: "Produsul nu există" });
      finalUnitPrice = product.price;
    }

    const productData = await get(
      `SELECT stock, status, seller, title FROM products WHERE id = ?`,
      [productId]
    );

    if (productData.stock < finalQuantity) {
      return res
        .status(400)
        .json({
          error: `Stoc insuficient. Negocierea a fost pentru ${finalQuantity}, dar mai sunt doar ${productData.stock}.`,
        });
    }
    if (productData.status !== "ACTIVE") {
      return res.status(400).json({ error: "Produsul nu mai este activ." });
    }

    const totalPrice = finalUnitPrice * finalQuantity;

    const orderId = uuid();
    await run(
      `INSERT INTO orders (id, buyer_id, product_id, price, quantity, status, shipping_address, negotiation_id) 
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        orderId,
        buyerId,
        productId,
        totalPrice,
        finalQuantity,
        shipping_address,
        negotiationId || null,
      ]
    );

    await run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
      finalQuantity,
      productId,
    ]);

    await sendNotification(
      productData.seller,
      `You sold ${finalQuantity} x "${productData.title}" for ${totalPrice} RON!`,
      "order"
    );

    res
      .status(201)
      .json({
        id: orderId,
        price: totalPrice,
        quantity: finalQuantity,
        status: "pending",
      });
  } catch (e) {
    next(e);
  }
};

export const getBuyingOrders = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const orders = await all(
      `
      SELECT 
        o.id, 
        o.price, 
        o.status, 
        o.created_at, 
        p.title as product_title, 
        p.imageUrl as product_image,
        p.id as product_id
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `,
      [userId]
    );

    res.json(orders);
  } catch (e) {
    next(e);
  }
};

export const getSellingOrders = async (req, res, next) => {
  try {
    const sellerId = req.user.sub;

    const orders = await all(
      `
      SELECT 
        o.id, 
        o.product_id,
        o.price, 
        o.status, 
        o.created_at, 
        o.shipping_address,
        p.title as product_title, 
        p.imageUrl as product_image,
        u.email as buyer_email,
        u.name as buyer_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      WHERE p.seller = ?
      ORDER BY o.created_at DESC
    `,
      [sellerId]
    );

    res.json(orders);
  } catch (e) {
    next(e);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    const order = await get(
      `
      SELECT 
        o.*, 
        p.title, 
        p.imageUrl, 
        p.seller as seller_id,
        u_buyer.email as buyer_email,
        u_buyer.name as buyer_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u_buyer ON o.buyer_id = u_buyer.id
      WHERE o.id = ?
    `,
      [id]
    );

    if (!order) return res.status(404).json({ error: "Comanda nu există" });

    const isBuyer = order.buyer_id === userId;
    const isSeller = order.seller_id === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: "Nu ai acces la această comandă" });
    }

    res.json({ ...order, role: isBuyer ? "buyer" : "seller" });
  } catch (e) {
    next(e);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.sub;

    const allowedStatuses = [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Status invalid" });
    }

    const orderData = await get(
      `
      SELECT o.id, o.buyer_id, p.seller, p.title as product_title
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `,
      [id]
    );

    if (!orderData) return res.status(404).json({ error: "Comanda nu există" });

    if (orderData.seller !== userId) {
      return res
        .status(403)
        .json({ error: "Doar vânzătorul poate actualiza statusul" });
    }

    await run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);

    let notificationMessage = `Your order for "${orderData.product_title}" status updated to: ${status}`;
    if (status === "shipped")
      notificationMessage = `Your order for "${orderData.product_title}" has been shipped! 🚚`;
    if (status === "delivered")
      notificationMessage = `Your order for "${orderData.product_title}" has been delivered! 🎉`;

    await sendNotification(orderData.buyer_id, notificationMessage, "order");

    res.json({ message: "Status actualizat", status });
  } catch (e) {
    next(e);
  }
};

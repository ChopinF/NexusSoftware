import { v4 as uuid } from "uuid";
import { run, all, get } from "../utils/db.js";
import { getResponseGPT } from "../utils/openai.js";
import { processBody, prepareUpdateStatement } from "../utils/helpers.js";

// GET /conversations/user/:userId
export const getUserConversations = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const conversations = await all(
      `SELECT c.id as conversation_id, c.seller_id, c.buyer_id, 
                    m.id as id, m.created_at, m.message, m.is_read, m.from_user, m.to_user,
                    seller.name as seller_name, buyer.name as buyer_name
                    FROM conversations c 
                    INNER JOIN messages m ON m.conversation_id = c.id
                    LEFT JOIN users seller ON c.seller_id = seller.id
                    LEFT JOIN users buyer ON c.buyer_id = buyer.id
                    WHERE c.seller_id = ? OR c.buyer_id = ? ORDER BY m.created_at DESC`,
      [userId, userId]
    );
    res.json(conversations);
  } catch (e) {
    next(e);
  }
};

// GET /conversations/:id/user/:userId
export const getConversationMessages = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const conversationId = req.params.id;
    const conversationMessages = await all(
      `SELECT c.id as conversation_id, c.seller_id, c.buyer_id, m.id as id, m.created_at, m.message, m.is_read, m.from_user, m.to_user
                    FROM conversations c INNER JOIN messages m ON m.conversation_id = c.id
                    WHERE (c.seller_id = ? OR c.buyer_id = ?) AND c.id = ? ORDER BY m.created_at ASC`,
      [userId, userId, conversationId]
    );
    if (!conversationMessages || conversationMessages.length === 0)
      return res.json([]);

    res.json(conversationMessages);
  } catch (e) {
    next(e);
  }
};

// GET /conversations/:cid/messages/:mid
export const getMessageById = async (req, res, next) => {
  try {
    const conversationId = req.params.cid;
    const messageId = req.params.mid;
    const message = await get(
      `SELECT m.id, m.created_at, m.message, m.is_read, m.from_user, m.to_user
                    FROM messages m WHERE m.conversation_id = ? AND m.id = ?`,
      [conversationId, messageId]
    );
    if (!message) return res.status(404).json({ error: "Message not found" });
    res.json(message);
  } catch (e) {
    next(e);
  }
};

// POST /conversations
export const createConversation = async (req, res, next) => {
  try {
    const { buyer_id, seller_id } = req.body;
    const conversationId = uuid();
    await run(
      `INSERT INTO conversations (id, seller_id, buyer_id) VALUES (?,?,?)`,
      [conversationId, seller_id, buyer_id]
    );
    const newConversation = {
      id: conversationId,
      seller_id,
      buyer_id,
    };
    res.status(201).json(newConversation);
  } catch (e) {
    next(e);
  }
};

// POST /conversations/:id/messages
export const createMessage = async (req, res, next) => {
  try {
    const { message, from_user, created_at, is_read, to_user } = req.body;
    const conversation_id = req.params.id;
    const messageId = uuid();
    await run(
      `INSERT INTO messages (id, conversation_id, message, created_at, is_read, from_user, to_user) VALUES (?,?,?,?,?,?,?)`,
      [
        messageId,
        conversation_id,
        message,
        created_at,
        parseInt(is_read),
        from_user,
        to_user,
      ]
    );
    const newMessage = {
      id: messageId,
      conversation_id,
      message,
      created_at,
      is_read: parseInt(is_read),
      from_user,
      to_user,
    };
    res.status(201).json(newMessage);
  } catch (e) {
    next(e);
  }
};

// PUT /conversations/:cid/messages/:mid
export const updateMessage = async (req, res, next) => {
  try {
    const numericColumns = ["is_read"];
    const processedBody = processBody(req.body, numericColumns);
    const MESSAGE_UPDATABLE_COLUMNS = ["message", "is_read", "created_at"];
    const { statement, values } = prepareUpdateStatement(
      processedBody,
      "messages",
      MESSAGE_UPDATABLE_COLUMNS
    );
    const finalValues = [...values, req.params.mid];

    await run(statement, finalValues);
    const updated = await get(`SELECT * FROM messages WHERE id = ?`, [
      req.params.mid,
    ]);
    if (!updated)
      return res.status(404).json({ error: "Message not found after update" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

// POST /crawler
export const crawler = async (req, res, next) => {
  const { text } = req.body;
  try {
    const SYSTEM = `
      You are a link-finding assistant. Given a user's question, return the TOP 5 most relevant, authoritative, and recent URLs.
      Rules:
      - Prefer primary sources (official docs, publishers, maintainers) and reputable outlets.
      - Include only URLs you are confident actually exist (avoid guessing).
      - Each item must include: url, title, and a short reason.
      - Output STRICT JSON only, exactly this schema and nothing else:
      {"links":[{"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}]}
    `.trim();

    const result = await getResponseGPT(SYSTEM, text, true);
    return res.json(result);
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /msg
export const chatBot = async (req, res, next) => {
  const { text } = req.body;
  try {
    const SYSTEM = `
      You are a helpful assistant for a marketplace website called "EdgeUp".
      Your main goal is to help users find products, understand how the site works, and answer questions related to buying and selling.
      
      Rules:
      - Your name is "Edger Assistant".
      - The marketplace is similar to Vinted or OLX, where users can buy and sell items.
      - The available product categories are: Electronics, Books, Clothes, Home, and Other.
      - Only users with a "Trusted" role are allowed to sell items.
      - Be friendly, concise, and helpful.
      - If the user asks a question unrelated to the marketplace (like "who is the president" or "what is 10+10"), politely decline and guide them back to the marketplace topics.
      - IMPORTANT: You MUST always respond in the same language the user uses (if they ask in Romanian, respond in Romanian).

      Example Conversation:
      User: salut! ce este EdgeUp?
      Bot: Salut! EdgeUp este un site unde poți cumpăra și vinde diverse produse, asemănător cu Vinted sau eMAG.
      
      User: can i sell my laptop?
      Bot: Yes, you can sell items like laptops. You just need to have a "Trusted" seller account to post an ad.
      
      User: cine ești?
      Bot: Sunt asistentul virtual al acestui marketplace. Te pot ajuta cu întrebări despre produse sau despre cum funcționează site-ul.
      
      User: what's the weather?
      Bot: Îmi pare rău, rolul meu este să te ajut cu informații despre marketplace-ul nostru. Nu am acces la date meteo.
    `.trim();

    const result = await getResponseGPT(SYSTEM, text);
    return res.json(result);
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

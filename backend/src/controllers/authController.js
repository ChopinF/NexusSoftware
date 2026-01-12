import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { run, get } from "../utils/db.js";
import { Roles, Countries, Cities } from "../config/constants.js";
import { attachAvatarToUser, assert } from "../utils/helpers.js";

// POST /login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    assert(email && password, "email & password missing");

    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
      city: user.city,
      karma: user.karma,
      avatarUrl: user.avatarUrl,
    };

    const userWithImage = attachAvatarToUser(userResponse);

    return res.status(200).json({
      token,
      user: userWithImage,
    });
  } catch (e) {
    next(e);
  }
};

// POST /register
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = Roles.Untrusted,
      country,
      city,
    } = req.body;

    assert(name && email && password, "name, email, password sunt obligatorii");
    assert(Object.values(Roles).includes(role), "invalid role");
    assert(Countries.includes(country), "invalid country");
    assert(Cities[country]?.includes(city), "invalid city for country");

    const exists = await get(`SELECT 1 AS ok FROM users WHERE email = ?`, [
      email,
    ]);
    assert(!exists, "email deja folosit", 409);

    const hashed = await bcrypt.hash(password, 10);

    let avatarUrl = null;
    if (req.file) {
      avatarUrl = "/" + req.file.path.replace(/\\/g, "/");
    }

    const id = uuid();

    await run(
      `INSERT INTO users (id, name, email, password, role, country, city, karma, avatarUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, name, email, hashed, role, country, city, avatarUrl]
    );

    const token = jwt.sign({ sub: id, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || "1h",
    });

    return res.status(201).json({
      token,
      user: { id, name, email, role, country, city, avatarUrl },
    });
  } catch (e) {
    next(e);
  }
};

// GET /me
export const getMe = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await get(
      `SELECT id, name, email, role, country, city, karma, avatarUrl FROM users WHERE id = ?`,
      [payload.sub]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userWithImage = attachAvatarToUser(user);

    return res.status(200).json({ user: userWithImage });
  } catch (e) {
    next(e);
  }
};

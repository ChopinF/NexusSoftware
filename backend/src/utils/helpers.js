import path from "path";
import fs from "fs";

export const assert = (cond, msg, code = 400) => {
  if (!cond) {
    const e = new Error(msg);
    e.status = code;
    throw e;
  }
};

export function validateInteger(price) {
  return !isNaN(parseInt(price)) && parseInt(price) > 0;
}

export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validateProduct(product) {
  const { title, description, price, category } = product;
  let errors = [];
  if (!title) errors.push("Invalid title");
  if (!description) errors.push("Invalid description");
  if (!validateInteger(price)) errors.push("Invalid price");
  if (!category) errors.push("Invalid category");
  if (errors.length > 0) throw new Error(errors.join("; "));
}

export function validateOrder(order) {
  const { price, status, shipping_address, productId } = order;
  let errors = [];

  if (
    price === undefined ||
    price === null ||
    isNaN(parseInt(price)) ||
    parseInt(price) < 0
  ) {
    errors.push("Invalid price: must be a positive number");
  }

  const validStatuses = [
    "pending",
    "paid",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (!status || !validStatuses.includes(status)) {
    errors.push(`Invalid status: must be one of ${validStatuses.join(", ")}`);
  }

  if (
    !shipping_address ||
    typeof shipping_address !== "string" ||
    shipping_address.trim().length < 5
  ) {
    errors.push("Invalid shipping address: must be at least 5 characters long");
  }

  if (!productId || typeof productId !== "string") {
    errors.push("Product ID is required to process the order");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export function validateReview(review) {
  const { productTitle, user, rating, comment } = review;
  let errors = [];
  if (!productTitle) errors.push("Invalid product title");
  if (!user) errors.push("Invalid user");
  if (!validateInteger(rating)) errors.push("Invalid rating");
  if (!comment) errors.push("Invalid comment");
  if (errors.length > 0) throw new Error(errors.join("; "));
}

export function validateNotification(notification) {
  const { user, message, type, is_read, created_at } = notification;
  let errors = [];
  if (!user) errors.push("Invalid user id");
  if (!message) errors.push("Invalid message");
  if (!type) errors.push("Invalid type");
  if (!created_at) errors.push("Invalid creation date");
  if (errors.length > 0) throw new Error(errors.join("; "));
}

export const attachAvatarToUser = (user) => {
  if (!user || !user.avatarUrl) return user;

  try {
    const relativePath = user.avatarUrl.startsWith("/")
      ? user.avatarUrl.slice(1)
      : user.avatarUrl;

    const absolutePath = path.resolve(relativePath);
    if (fs.existsSync(absolutePath)) {
      const imageBuffer = fs.readFileSync(absolutePath);

      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString(
        "base64"
      )}`;

      return { ...user, avatarImage: base64Image };
    }
  } catch (err) {
    console.error("Error processing avatar:", err);
  }

  return user;
};

export function processBody(body, numericColumns) {
  let processedBody = { ...body };
  for (const key of Object.keys(processedBody)) {
    if (numericColumns.includes(key)) {
      const value = processedBody[key];
      if (value !== null && value !== undefined && value !== "")
        processedBody[key] = parseInt(value, 10);
    }
  }
  return processedBody;
}

export function prepareUpdateStatement(updatedData, table, allowedColumns) {
  const allowedKeys = Object.keys(updatedData).filter((key) =>
    allowedColumns.includes(key)
  );
  const validKeys = allowedKeys.filter((key) => {
    const value = updatedData[key];
    return value !== null && value !== undefined && value !== "";
  });
  if (validKeys.length === 0)
    throw new Error("No valid fields provided for update.");

  const setClause = validKeys.map((key) => `\`${key}\` = ?`).join(", ");
  const values = validKeys.map((key) => updatedData[key]);
  const statement = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
  return { statement, values };
}

import multer from "multer";
import path from "path";

const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join("uploads", subfolder));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  });
};

export const uploadProduct = multer({ storage: createStorage("products") });
export const uploadAvatar = multer({ storage: createStorage("avatars") });

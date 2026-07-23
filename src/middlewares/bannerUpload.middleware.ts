import multer from "multer";
import path from "path";
import fs from "fs";

const bannerUploadPath = path.join(process.cwd(), "uploads", "banners");

if (!fs.existsSync(bannerUploadPath)) {
  fs.mkdirSync(bannerUploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, bannerUploadPath);
  },

  filename: (_req, file, cb) => {
    const uniqueName = `banner-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

export const bannerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
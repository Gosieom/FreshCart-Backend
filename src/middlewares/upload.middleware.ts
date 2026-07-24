import multer from "multer";

const allowedImageTypes =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);

const imageFileFilter:
  multer.Options["fileFilter"] = (
    _req,
    file,
    callback
  ) => {
    if (
      allowedImageTypes.has(
        file.mimetype
      )
    ) {
      callback(null, true);
      return;
    }

    callback(
      new Error(
        "Only JPEG, PNG, WEBP, and GIF image files are allowed"
      )
    );
  };

export const createImageUpload = (
  maxFileSize: number
) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: imageFileFilter,
    limits: {
      fileSize: maxFileSize,
    },
  });
};

export const profileUpload =
  createImageUpload(
    5 * 1024 * 1024
  );

import fs from "fs";
import path from "path";

import {
  CLOUDINARY_FOLDER,
} from "../config";

import {
  cloudinary,
  isCloudinaryConfigured,
} from "../config/cloudinary";

const getErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
};

const normalizeFolder = (
  folder: string
) => {
  return folder
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "-");
};

const getCloudinaryPublicId = (
  imageUrl: string
) => {
  try {
    const url = new URL(imageUrl);

    if (
      url.hostname !==
      "res.cloudinary.com"
    ) {
      return "";
    }

    const uploadMarker =
      "/upload/";

    const markerIndex =
      url.pathname.indexOf(
        uploadMarker
      );

    if (markerIndex < 0) {
      return "";
    }

    const assetPath =
      url.pathname.slice(
        markerIndex +
          uploadMarker.length
      );

    const parts = assetPath
      .split("/")
      .filter(Boolean);

    const versionIndex =
      parts.findIndex((part) =>
        /^v\d+$/.test(part)
      );

    const publicIdParts =
      versionIndex >= 0
        ? parts.slice(
            versionIndex + 1
          )
        : parts;

    const publicId =
      publicIdParts.join("/");

    return publicId.replace(
      /\.[^/.]+$/,
      ""
    );
  } catch {
    return "";
  }
};

const deleteLocalImage = (
  imagePath: string
) => {
  const cleanPath = imagePath
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");

  const absolutePath = path.join(
    process.cwd(),
    cleanPath
  );

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

export const uploadImageBuffer = (
  buffer: Buffer,
  subfolder: string
): Promise<string> => {
  if (!isCloudinaryConfigured) {
    return Promise.reject(
      new Error(
        "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to the backend .env file."
      )
    );
  }

  const folder = [
    normalizeFolder(
      CLOUDINARY_FOLDER
    ),
    normalizeFolder(subfolder),
  ]
    .filter(Boolean)
    .join("/");

  return new Promise(
    (resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            unique_filename: true,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(
                new Error(
                  error.message ||
                    "Cloud image upload failed"
                )
              );
              return;
            }

            if (!result?.secure_url) {
              reject(
                new Error(
                  "Cloudinary did not return an image URL"
                )
              );
              return;
            }

            resolve(
              result.secure_url
            );
          }
        );

      uploadStream.end(buffer);
    }
  );
};

export const deleteStoredImage = async (
  imageUrl?: string
) => {
  if (
    !imageUrl ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return;
  }

  try {
    if (
      imageUrl.startsWith("http")
    ) {
      const publicId =
        getCloudinaryPublicId(
          imageUrl
        );

      if (
        publicId &&
        isCloudinaryConfigured
      ) {
        await cloudinary.uploader.destroy(
          publicId,
          {
            resource_type: "image",
            invalidate: true,
          }
        );
      }

      return;
    }

    deleteLocalImage(imageUrl);
  } catch (error: unknown) {
    console.error(
      "IMAGE DELETE ERROR:",
      getErrorMessage(
        error,
        "Stored image could not be deleted"
      )
    );
  }
};

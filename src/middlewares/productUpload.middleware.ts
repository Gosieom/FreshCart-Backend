import {
  createImageUpload,
} from "./upload.middleware";

export const productUpload =
  createImageUpload(
    3 * 1024 * 1024
  );

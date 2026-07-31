import {
  createImageUpload,
} from "./upload.middleware";

export const categoryUpload =
  createImageUpload(
    3 * 1024 * 1024
  );

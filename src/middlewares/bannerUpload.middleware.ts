import {
  createImageUpload,
} from "./upload.middleware";

export const bannerUpload =
  createImageUpload(
    5 * 1024 * 1024
  );

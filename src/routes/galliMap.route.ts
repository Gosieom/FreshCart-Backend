import { Router } from "express";

import {
  galliAutocomplete,
  galliSearch,
} from "../controllers/galliMap.controller";

import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.get(
  "/autocomplete",
  authMiddleware,
  galliAutocomplete
);

router.get(
  "/search",
  authMiddleware,
  galliSearch
);

export default router;

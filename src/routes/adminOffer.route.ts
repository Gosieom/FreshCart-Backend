import { Router } from "express";
import { adminOnly } from "../middlewares/admin.middleware";
import {
  getAdminOfferProducts,
  removeProductOffer,
  updateProductOffer,
} from "../controllers/offer.controller";

const router = Router();

router.use(adminOnly);

router.get("/", getAdminOfferProducts);
router.patch("/:id", updateProductOffer);
router.patch("/:id/remove", removeProductOffer);

export default router;
import { Router } from "express";
import { getPublicOffers } from "../controllers/offer.controller";

const router = Router();

router.get("/", getPublicOffers);

export default router;
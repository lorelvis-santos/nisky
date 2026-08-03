import { Router } from "express";

const router = Router();
router.get("/", (_req, res) => res.success({ status: "running", service: "nisky-backend" }));

export default router;

import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { eventsController } from "./events.controller";
import { createEventSchema, idParamSchema, queryRangeSchema, updateEventSchema } from "./events.validator";

const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(queryRangeSchema), eventsController.list.bind(eventsController));
router.get("/today", eventsController.today.bind(eventsController));
router.post("/", validateBody(createEventSchema), eventsController.create.bind(eventsController));
router.patch("/:id", validateParams(idParamSchema), validateBody(updateEventSchema), eventsController.update.bind(eventsController));
router.delete("/:id", validateParams(idParamSchema), eventsController.delete.bind(eventsController));

export default router;

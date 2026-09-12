import { Router } from "express";
import { requireAuth, requireJwtAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware";
import { OAuthController, oauthErrorMiddleware } from "./oauth.controller";
import { authorizeDecisionSchema, authorizeSchema, registrationSchema, revocationSchema, tokenSchema } from "./oauth.validator";

const router = Router();
const controller = new OAuthController();

router.get("/authorize", requireJwtAuth, validateQuery(authorizeSchema), controller.authorize);
router.post("/authorize", requireJwtAuth, validateBody(authorizeDecisionSchema), controller.decision);
router.post("/token", validateBody(tokenSchema), controller.token);
router.post("/register", validateBody(registrationSchema), controller.register);
router.post("/revoke", validateBody(revocationSchema), controller.revoke);
router.post("/introspect", requireAuth, controller.introspect);
router.use(oauthErrorMiddleware);

export default router;

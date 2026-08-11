import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { CommentController } from "./comments.controller";
import {
  commentIdParamSchema,
  createCommentSchema,
  projectIdParamSchema,
  taskIdParamSchema,
  updateCommentSchema,
} from "./comments.validator";

const router = Router();
const controller = new CommentController();

router.use(requireAuth);

router.get("/projects/:projectId/comments", validateParams(projectIdParamSchema), controller.listProjectComments);
router.post("/projects/:projectId/comments", validateParams(projectIdParamSchema), validateBody(createCommentSchema), controller.createProjectComment);
router.get("/tasks/:taskId/comments", validateParams(taskIdParamSchema), controller.listTaskComments);
router.post("/tasks/:taskId/comments", validateParams(taskIdParamSchema), validateBody(createCommentSchema), controller.createTaskComment);
router.patch("/comments/:id", validateParams(commentIdParamSchema), validateBody(updateCommentSchema), controller.updateComment);
router.delete("/comments/:id", validateParams(commentIdParamSchema), controller.deleteComment);

export default router;
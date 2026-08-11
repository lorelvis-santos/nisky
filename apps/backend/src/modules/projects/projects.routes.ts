import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { ProjectController } from "./projects.controller";
import {
  createProjectSchema, idParamSchema, invitationIdParamSchema, inviteMemberSchema, memberIdParamSchema,
  projectIdParamSchema, updateProjectSchema, updateMemberRoleSchema,
} from "./projects.validator";

const router = Router();
const controller = new ProjectController();

router.use(requireAuth);
router.get("/", controller.list);
router.get("/accessible", controller.listUserProjects);
router.get("/invitations/pending", controller.listPendingInvitations);
router.post("/invitations/:invitationId/accept", validateParams(invitationIdParamSchema), controller.acceptInvitation);
router.post("/invitations/:invitationId/decline", validateParams(invitationIdParamSchema), controller.declineInvitation);
router.post("/", validateBody(createProjectSchema), controller.create);
router.post("/:id/leave", validateParams(idParamSchema), controller.leave);
router.get("/:id", validateParams(idParamSchema), controller.getById);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateProjectSchema), controller.update);
router.patch("/:id/default", validateParams(idParamSchema), controller.setDefault);
router.delete("/:id", validateParams(idParamSchema), controller.delete);
router.get("/:projectId/members", validateParams(projectIdParamSchema), controller.listMembers);
router.post("/:projectId/invitations", validateParams(projectIdParamSchema), validateBody(inviteMemberSchema), controller.inviteMember);
router.delete("/:projectId/members/:memberId", validateParams(memberIdParamSchema), controller.removeMember);
router.patch("/:projectId/members/:memberId/role", validateParams(memberIdParamSchema), validateBody(updateMemberRoleSchema), controller.updateMemberRole);

export default router;
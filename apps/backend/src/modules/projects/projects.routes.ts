import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { ProjectController } from "./projects.controller";
import {
  createProjectSchema, idParamSchema, invitationIdParamSchema, inviteMemberSchema, memberIdParamSchema,
  projectActivityQuerySchema, projectIdParamSchema, resourceIdParamSchema, createResourceSchema, updateProjectSchema, updateMemberRoleSchema,
} from "./projects.validator";

const router = Router();
const controller = new ProjectController();

router.use(requireAuth);
router.get("/", controller.list);
router.get("/accessible", controller.listUserProjects);
router.get("/invitations/pending", controller.listPendingInvitations);
router.post("/invitations/:invitationId/accept", validateParams(invitationIdParamSchema), controller.acceptInvitation);
router.post("/invitations/:invitationId/decline", validateParams(invitationIdParamSchema), controller.declineInvitation);
router.delete("/invitations/:invitationId", validateParams(invitationIdParamSchema), controller.cancelInvitation);
router.post("/", validateBody(createProjectSchema), controller.create);
router.post("/:id/leave", validateParams(idParamSchema), controller.leave);
router.get("/:id/summary", validateParams(idParamSchema), controller.summary);
router.get("/:id", validateParams(idParamSchema), controller.getById);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateProjectSchema), controller.update);
router.patch("/:id/default", validateParams(idParamSchema), controller.setDefault);
router.delete("/:id", validateParams(idParamSchema), controller.delete);
router.get("/:projectId/members", validateParams(projectIdParamSchema), controller.listMembers);
router.get("/:projectId/invitations", validateParams(projectIdParamSchema), controller.listProjectInvitations);
router.post("/:projectId/invitations", validateParams(projectIdParamSchema), validateBody(inviteMemberSchema), controller.inviteMember);
router.delete("/:projectId/members/:memberId", validateParams(memberIdParamSchema), controller.removeMember);
router.patch("/:projectId/members/:memberId/role", validateParams(memberIdParamSchema), validateBody(updateMemberRoleSchema), controller.updateMemberRole);
router.get("/:projectId/activity", validateParams(projectIdParamSchema), validateQuery(projectActivityQuerySchema), controller.listActivity);
router.get("/:projectId/resources", validateParams(projectIdParamSchema), controller.listResources);
router.post("/:projectId/resources", validateParams(projectIdParamSchema), validateBody(createResourceSchema), controller.createResource);
router.delete("/:projectId/resources/:resourceId", validateParams(resourceIdParamSchema), controller.deleteResource);

export default router;

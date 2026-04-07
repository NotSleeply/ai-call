import { Router } from "express";
import { DaxiaAssistant } from "../../assistant.js";
import { createSkillController } from "../controllers/skillController.js";

export function createSkillRoutes(assistant: DaxiaAssistant): Router {
  const skillRoutes = Router();
  const controller = createSkillController(assistant);

  skillRoutes.get("/skills", controller.listSkills);
  skillRoutes.post("/skills", controller.createSkill);
  skillRoutes.put("/skills/:id", controller.updateSkill);
  skillRoutes.delete("/skills/:id", controller.deleteSkill);
  skillRoutes.post("/skills/:id/run", controller.runSkill);

  return skillRoutes;
}

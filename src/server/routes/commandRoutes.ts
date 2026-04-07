import { Router } from "express";
import { DaxiaAssistant } from "../../assistant.js";
import { createCommandHandler } from "../controllers/commandController.js";

export function createCommandRoutes(
  assistant: DaxiaAssistant,
  publicServerOrigin: string,
): Router {
  const commandRoutes = Router();
  const commandHandler = createCommandHandler(assistant, publicServerOrigin);

  commandRoutes.post("/command", commandHandler);

  return commandRoutes;
}

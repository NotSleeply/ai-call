import { Router } from "express";
import { DaxiaAssistant } from "../../assistant.js";
import { createCommandHandler } from "../controllers/commandController.js";
import { TaskSchedulerService } from "../scheduler/taskSchedulerService.js";

export function createCommandRoutes(
  assistant: DaxiaAssistant,
  scheduler: TaskSchedulerService,
  publicServerOrigin: string,
): Router {
  const commandRoutes = Router();
  const commandHandler = createCommandHandler(
    assistant,
    scheduler,
    publicServerOrigin,
  );

  commandRoutes.post("/command", commandHandler);

  return commandRoutes;
}

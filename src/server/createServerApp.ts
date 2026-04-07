import express from "express";
import cors from "cors";
import { join } from "path";
import { DaxiaAssistant } from "../assistant.js";
import { PUBLIC_SERVER_ORIGIN } from "./config.js";
import { conversationRoutes } from "./routes/conversationRoutes.js";
import { createCommandRoutes } from "./routes/commandRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { createScheduleRoutes } from "./routes/scheduleRoutes.js";
import { createSkillRoutes } from "./routes/skillRoutes.js";
import { TaskSchedulerService } from "./scheduler/taskSchedulerService.js";

export function createServerApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/out", express.static(join(process.cwd(), "out")));

  const assistant = new DaxiaAssistant();
  const scheduler = new TaskSchedulerService(assistant);

  app.use("/api", conversationRoutes);
  app.use(
    "/api",
    createCommandRoutes(assistant, scheduler, PUBLIC_SERVER_ORIGIN),
  );
  app.use("/api", createScheduleRoutes(scheduler));
  app.use("/api", createSkillRoutes(assistant));
  app.use("/api", healthRoutes);

  return app;
}

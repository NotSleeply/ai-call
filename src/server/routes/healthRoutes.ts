import { Router } from "express";
import { getHealthStatus } from "../controllers/healthController.js";

const healthRoutes: Router = Router();

healthRoutes.get("/health", getHealthStatus);

export { healthRoutes };

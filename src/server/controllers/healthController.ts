import { Request, Response } from "express";

export function getHealthStatus(_req: Request, res: Response): void {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
}

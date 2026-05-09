#!/usr/bin/env node
/**
 * SmallClaw - 应用入口
 *
 * 职责：启动 CLI 应用
 */
import { SmallClawCLI } from "./app/cli.js";

const cli = new SmallClawCLI();
cli.start().catch(console.error);

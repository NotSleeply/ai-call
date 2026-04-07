import type { Ref } from "vue";
import { daxiaAPI, type CommandResponse } from "../../../api/daxia";
import { commandConfig } from "../constants";
import { wait } from "../utils";

interface LoadingController {
  startLoadingState: (text: string) => void;
  stopLoadingState: () => void;
}

interface ScrollController {
  scrollToBottom: () => void;
}

export function useCommandExecution(
  currentChatId: Ref<number>,
  loadingController: LoadingController,
  scrollController: ScrollController,
) {
  async function executeCommand(
    command: string,
  ): Promise<CommandResponse | null> {
    const cmd = command.split(" ")[0];
    const config = commandConfig[cmd] || { loading: "执行中..." };
    loadingController.startLoadingState(config.loading);

    const startTime = Date.now();
    const minDuration = 2600 + Math.random() * 3200;

    let response: CommandResponse | null = null;

    try {
      response = await daxiaAPI.executeCommand(command, currentChatId.value);
    } catch (error) {
      console.error("执行命令失败:", error);
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < minDuration) {
        await wait(minDuration - elapsed);
      }
      loadingController.stopLoadingState();
      scrollController.scrollToBottom();
    }

    return response;
  }

  async function handleChat(text: string): Promise<CommandResponse | null> {
    loadingController.startLoadingState("思考中...");

    const startTime = Date.now();
    const minDuration = 2200 + Math.random() * 2800;

    let response: CommandResponse | null = null;

    try {
      response = await daxiaAPI.executeCommand(text, currentChatId.value);
    } catch (error) {
      console.error("对话失败:", error);
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < minDuration) {
        await wait(minDuration - elapsed);
      }
      loadingController.stopLoadingState();
      scrollController.scrollToBottom();
    }

    return response;
  }

  return {
    executeCommand,
    handleChat,
  };
}

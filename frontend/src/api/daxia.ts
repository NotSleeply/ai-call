import * as conversationApi from "./conversations";
import * as commandApi from "./commands";

export * from "./types";

export const daxiaAPI = {
  ...conversationApi,
  ...commandApi,
};

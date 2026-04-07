import * as conversationApi from "./conversations";
import * as commandApi from "./commands";
import * as scheduleApi from "./schedules";
import * as skillsApi from "./skills";

export * from "./types";

export const daxiaAPI = {
  ...conversationApi,
  ...commandApi,
  ...scheduleApi,
  ...skillsApi,
};

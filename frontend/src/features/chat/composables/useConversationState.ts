import { computed, nextTick, ref } from "vue";
import { daxiaAPI, type Conversation, type Message } from "../../../api/daxia";

export function useConversationState() {
  const chatList = ref<Conversation[]>([]);
  const messages = ref<Message[]>([]);
  const currentChatId = ref(1);
  const messageListRef = ref<HTMLElement | null>(null);
  let loadMessagesToken = 0;

  const currentChat = computed(() =>
    chatList.value.find((chat) => chat.id === currentChatId.value),
  );

  function scrollToBottom(): void {
    nextTick(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
      }
    });
  }

  async function loadChatList(): Promise<void> {
    try {
      chatList.value = await daxiaAPI.getConversations();
      const hasCurrent = chatList.value.some(
        (chat) => chat.id === currentChatId.value,
      );

      if (chatList.value.length > 0 && !hasCurrent) {
        currentChatId.value = chatList.value[0].id;
      }
    } catch (error) {
      console.error("加载对话列表失败:", error);
    }
  }

  async function loadMessages(conversationId: number = currentChatId.value): Promise<void> {
    if (!conversationId) return;

    const token = ++loadMessagesToken;

    try {
      const conversation = await daxiaAPI.getConversation(conversationId);

      // Ignore stale loads or responses for conversations that are no longer active.
      if (token !== loadMessagesToken || conversationId !== currentChatId.value) {
        return;
      }

      messages.value = conversation.messages || [];
      scrollToBottom();
    } catch (error) {
      console.error("加载消息失败:", error);
      if (conversationId === currentChatId.value) {
        messages.value = [];
      }
    }
  }

  async function createNewChat(): Promise<void> {
    try {
      const conversation = await daxiaAPI.createConversation();
      chatList.value.unshift(conversation);
      currentChatId.value = conversation.id;
      messages.value = [];
    } catch (error) {
      console.error("创建对话失败:", error);
    }
  }

  function selectChat(id: number): void {
    currentChatId.value = id;
  }

  async function deleteChat(id: number): Promise<void> {
    if (!confirm("确定要删除这个对话吗？")) return;

    try {
      await daxiaAPI.deleteConversation(id);
      chatList.value = chatList.value.filter((chat) => chat.id !== id);

      if (currentChatId.value === id) {
        if (chatList.value.length > 0) {
          currentChatId.value = chatList.value[0].id;
        } else {
          await createNewChat();
        }
      }
    } catch (error) {
      console.error("删除对话失败:", error);
    }
  }

  function appendLocalMessage(
    role: "user" | "assistant",
    content: string,
  ): void {
    messages.value.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      conversation_id: currentChatId.value,
      role,
      content,
      created_at: new Date().toISOString(),
    });
    scrollToBottom();
  }

  return {
    chatList,
    messages,
    currentChatId,
    currentChat,
    messageListRef,
    scrollToBottom,
    loadChatList,
    loadMessages,
    createNewChat,
    selectChat,
    deleteChat,
    appendLocalMessage,
  };
}

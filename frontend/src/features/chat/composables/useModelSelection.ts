import { computed, ref } from "vue";
import type { ModelProvider } from "../../../api/daxia";

export interface SelectableModel {
  label: string;
  provider: Exclude<ModelProvider, "auto">;
  modelName: string;
}

const CUSTOM_MODELS_STORAGE_KEY = "smallclaw.custom-model-options";

export function useModelSelection() {
  const selectedModelProvider = ref<ModelProvider>("auto");
  const selectedModelName = ref("");

  const commonModels: SelectableModel[] = [
    {
      label: "DeepSeek Chat",
      provider: "deepseek",
      modelName: "deepseek-chat",
    },
    {
      label: "DeepSeek Reasoner",
      provider: "deepseek",
      modelName: "deepseek-reasoner",
    },
    { label: "Qwen3 (Ollama)", provider: "ollama", modelName: "qwen3:latest" },
    {
      label: "Qwen2.5 7B (Ollama)",
      provider: "ollama",
      modelName: "qwen2.5:7b",
    },
    {
      label: "Llama3.1 8B (Ollama)",
      provider: "ollama",
      modelName: "llama3.1:8b",
    },
    {
      label: "Mistral 7B (Ollama)",
      provider: "ollama",
      modelName: "mistral:7b",
    },
    { label: "Gemma2 9B (Ollama)", provider: "ollama", modelName: "gemma2:9b" },
    {
      label: "Gemini 3.1 Pro (Preview)",
      provider: "api",
      modelName: "gemini-3.1-pro",
    },
    { label: "GPT-5 mini", provider: "api", modelName: "gpt-5-mini" },
    { label: "GPT-5.3-Codex", provider: "api", modelName: "gpt-5.3-codex" },
    {
      label: "Raptor mini (Preview)",
      provider: "api",
      modelName: "raptor-mini",
    },
    { label: "Claude Opus 4.6", provider: "api", modelName: "claude-opus-4.6" },
    {
      label: "Claude Sonnet 4.6",
      provider: "api",
      modelName: "claude-sonnet-4.6",
    },
    { label: "GPT-5.4", provider: "api", modelName: "gpt-5.4" },
    {
      label: "Claude Haiku 4.5",
      provider: "api",
      modelName: "claude-haiku-4.5",
    },
    { label: "Gemini 2.5 Pro", provider: "api", modelName: "gemini-2.5-pro" },
    {
      label: "Gemini 3 Flash (Preview)",
      provider: "api",
      modelName: "gemini-3-flash",
    },
    { label: "GPT-4.1", provider: "api", modelName: "gpt-4.1" },
    { label: "GPT-4o", provider: "api", modelName: "gpt-4o" },
    { label: "GPT-5.1", provider: "api", modelName: "gpt-5.1" },
    { label: "GPT-5.2", provider: "api", modelName: "gpt-5.2" },
    { label: "GPT-5.2-Codex", provider: "api", modelName: "gpt-5.2-codex" },
    { label: "GPT-5.4 mini", provider: "api", modelName: "gpt-5.4-mini" },
    {
      label: "Grok Code Fast 1",
      provider: "api",
      modelName: "grok-code-fast-1",
    },
    {
      label: "Doubao-Seed-2.0-Code",
      provider: "api",
      modelName: "doubao-seed-2.0-code",
    },
    {
      label: "Doubao-Seed-Code",
      provider: "api",
      modelName: "doubao-seed-code",
    },
    { label: "MiniMax-M2.7", provider: "api", modelName: "minimax-m2.7" },
    { label: "MiniMax-M2.5", provider: "api", modelName: "minimax-m2.5" },
    { label: "GLM-5V-Turbo", provider: "api", modelName: "glm-5v-turbo" },
    { label: "GLM-5", provider: "api", modelName: "glm-5" },
    { label: "Kimi-K2.5", provider: "api", modelName: "kimi-k2.5" },
    { label: "Qwen3.5-Plus", provider: "api", modelName: "qwen3.5-plus" },
  ];

  const customModelProvider = ref<Exclude<ModelProvider, "auto">>("api");
  const customModelName = ref("");
  const customModels = ref<SelectableModel[]>([]);

  const selectedModelDisplay = computed(() => {
    if (selectedModelProvider.value === "auto") {
      return "Auto";
    }

    const allOptions = [...commonModels, ...customModels.value];
    const matched = allOptions.find(
      (item) =>
        item.provider === selectedModelProvider.value &&
        item.modelName === selectedModelName.value,
    );

    return (
      matched?.label ||
      `${selectedModelProvider.value}:${selectedModelName.value}`
    );
  });

  function chooseAutoModel(): void {
    selectedModelProvider.value = "auto";
    selectedModelName.value = "";
  }

  function chooseModelOption(model: SelectableModel): void {
    selectedModelProvider.value = model.provider;
    selectedModelName.value = model.modelName;
  }

  function saveCustomModels(): void {
    localStorage.setItem(
      CUSTOM_MODELS_STORAGE_KEY,
      JSON.stringify(customModels.value),
    );
  }

  function loadCustomModels(): void {
    try {
      const raw = localStorage.getItem(CUSTOM_MODELS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const mapped = parsed
        .map(
          (item): SelectableModel => ({
            label: String(item.label || item.modelName || "").trim(),
            provider:
              item.provider === "deepseek"
                ? "deepseek"
                : item.provider === "ollama"
                  ? "ollama"
                  : "api",
            modelName: String(item.modelName || "").trim(),
          }),
        )
        .filter((item) => item.label && item.modelName);

      customModels.value = mapped;
    } catch {
      customModels.value = [];
    }
  }

  function addCustomModel(): boolean {
    const name = customModelName.value.trim();
    if (!name) {
      return false;
    }

    const provider = customModelProvider.value;
    const alreadyExists = [...commonModels, ...customModels.value].some(
      (item) => item.provider === provider && item.modelName === name,
    );

    if (!alreadyExists) {
      customModels.value.unshift({
        label:
          provider === "deepseek"
            ? `DeepSeek · ${name}`
            : provider === "ollama"
              ? `Ollama · ${name}`
              : `API · ${name}`,
        provider,
        modelName: name,
      });
      saveCustomModels();
    }

    selectedModelProvider.value = provider;
    selectedModelName.value = name;
    customModelName.value = "";

    return true;
  }

  return {
    selectedModelProvider,
    selectedModelName,
    commonModels,
    customModelProvider,
    customModelName,
    customModels,
    selectedModelDisplay,
    chooseAutoModel,
    chooseModelOption,
    loadCustomModels,
    addCustomModel,
  };
}

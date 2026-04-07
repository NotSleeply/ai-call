import { computed, ref } from "vue";
import { daxiaAPI, type Skill } from "../../../api/daxia";

interface SkillForm {
  name: string;
  description: string;
  prompt: string;
  mode: "prompt" | "module";
  moduleEntry: string;
  autoTriggersText: string;
}

const initialForm: SkillForm = {
  name: "",
  description: "",
  prompt: "",
  mode: "prompt",
  moduleEntry: "",
  autoTriggersText: "",
};

function toTriggerText(triggers?: string[]): string {
  return (triggers || []).join("\n");
}

function toTriggerArray(text: string): string[] {
  return text
    .split(/\n|,|，/)
    .map((item) => item.trim())
    .filter((item) => Boolean(item));
}

export function useSkillManager() {
  const visible = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const running = ref(false);
  const error = ref("");

  const skills = ref<Skill[]>([]);
  const selectedSkillId = ref("");
  const taskInput = ref("");
  const runOutput = ref("");

  const createForm = ref<SkillForm>({ ...initialForm });
  const editForm = ref<SkillForm>({ ...initialForm });

  const selectedSkill = computed(
    () =>
      skills.value.find((skill) => skill.id === selectedSkillId.value) || null,
  );

  function openPanel(): void {
    visible.value = true;
    void refreshSkills();
  }

  function closePanel(): void {
    visible.value = false;
    error.value = "";
  }

  async function refreshSkills(): Promise<void> {
    loading.value = true;
    error.value = "";

    try {
      skills.value = await daxiaAPI.getSkills();
      if (!selectedSkillId.value && skills.value.length > 0) {
        selectSkill(skills.value[0].id);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "加载 Skill 失败";
    } finally {
      loading.value = false;
    }
  }

  function resetCreateForm(): void {
    createForm.value = { ...initialForm };
  }

  function selectSkill(id: string): void {
    selectedSkillId.value = id;
    const skill = skills.value.find((item) => item.id === id);
    if (!skill) return;

    editForm.value = {
      name: skill.name,
      description: skill.description,
      prompt: skill.prompt,
      mode: skill.mode || "prompt",
      moduleEntry: skill.module_entry || "",
      autoTriggersText: toTriggerText(skill.auto_triggers),
    };
    runOutput.value = "";
    taskInput.value = "";
  }

  async function createSkill(): Promise<void> {
    saving.value = true;
    error.value = "";

    try {
      const created = await daxiaAPI.createSkill({
        name: createForm.value.name,
        description: createForm.value.description,
        prompt: createForm.value.prompt,
        mode: createForm.value.mode,
        module_entry: createForm.value.moduleEntry,
        auto_triggers: toTriggerArray(createForm.value.autoTriggersText),
      });

      await refreshSkills();
      selectSkill(created.id);
      resetCreateForm();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "创建 Skill 失败";
    } finally {
      saving.value = false;
    }
  }

  async function updateSelectedSkill(): Promise<void> {
    if (!selectedSkill.value) return;

    saving.value = true;
    error.value = "";

    try {
      await daxiaAPI.updateSkill(selectedSkill.value.id, {
        name: editForm.value.name,
        description: editForm.value.description,
        prompt: editForm.value.prompt,
        mode: editForm.value.mode,
        module_entry: editForm.value.moduleEntry,
        auto_triggers: toTriggerArray(editForm.value.autoTriggersText),
      });
      await refreshSkills();
      selectSkill(selectedSkill.value.id);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "更新 Skill 失败";
    } finally {
      saving.value = false;
    }
  }

  async function deleteSelectedSkill(): Promise<void> {
    if (!selectedSkill.value) return;

    saving.value = true;
    error.value = "";

    try {
      const id = selectedSkill.value.id;
      await daxiaAPI.deleteSkill(id);
      await refreshSkills();
      const next = skills.value[0];
      if (next) {
        selectSkill(next.id);
      } else {
        selectedSkillId.value = "";
        editForm.value = { ...initialForm };
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "删除 Skill 失败";
    } finally {
      saving.value = false;
    }
  }

  async function runSelectedSkill(): Promise<void> {
    if (!selectedSkill.value) return;

    running.value = true;
    error.value = "";

    try {
      const result = await daxiaAPI.runSkill(
        selectedSkill.value.id,
        taskInput.value,
      );
      runOutput.value = result.output;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "运行 Skill 失败";
    } finally {
      running.value = false;
    }
  }

  return {
    visible,
    loading,
    saving,
    running,
    error,
    skills,
    selectedSkill,
    selectedSkillId,
    createForm,
    editForm,
    taskInput,
    runOutput,
    openPanel,
    closePanel,
    refreshSkills,
    selectSkill,
    createSkill,
    updateSelectedSkill,
    deleteSelectedSkill,
    runSelectedSkill,
  };
}

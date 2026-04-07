import { computed, ref, type Ref } from "vue";

export type CraftMode = "plan" | "ask" | "agent";

export function useToolbarMenus(toolbarMenuRef: Ref<HTMLElement | null>) {
  const selectedCraftMode = ref<CraftMode>("ask");

  const craftMenuOpen = ref(false);
  const modelMenuOpen = ref(false);
  const skillMenuOpen = ref(false);
  const skillSearchKeyword = ref("");

  const selectedCraftLabel = computed(() => {
    if (selectedCraftMode.value === "plan") return "Plan";
    if (selectedCraftMode.value === "agent") return "Agent";
    return "Ask";
  });

  function closeAllMenus(): void {
    craftMenuOpen.value = false;
    modelMenuOpen.value = false;
    skillMenuOpen.value = false;
  }

  function toggleCraftMenu(): void {
    craftMenuOpen.value = !craftMenuOpen.value;
    if (craftMenuOpen.value) {
      modelMenuOpen.value = false;
      skillMenuOpen.value = false;
    }
  }

  function chooseCraftMode(mode: CraftMode): void {
    selectedCraftMode.value = mode;
    craftMenuOpen.value = false;
  }

  function toggleModelMenu(): void {
    modelMenuOpen.value = !modelMenuOpen.value;
    if (modelMenuOpen.value) {
      craftMenuOpen.value = false;
      skillMenuOpen.value = false;
    }
  }

  function closeModelMenu(): void {
    modelMenuOpen.value = false;
  }

  function toggleSkillMenu(): void {
    skillMenuOpen.value = !skillMenuOpen.value;
    if (skillMenuOpen.value) {
      craftMenuOpen.value = false;
      modelMenuOpen.value = false;
      skillSearchKeyword.value = "";
    }
  }

  function closeSkillMenu(clearSearch = true): void {
    skillMenuOpen.value = false;
    if (clearSearch) {
      skillSearchKeyword.value = "";
    }
  }

  function handleClickOutsideMenus(event: MouseEvent): void {
    const target = event.target as Node;
    if (!toolbarMenuRef.value?.contains(target)) {
      closeAllMenus();
    }
  }

  return {
    selectedCraftMode,
    selectedCraftLabel,
    craftMenuOpen,
    modelMenuOpen,
    skillMenuOpen,
    skillSearchKeyword,
    toggleCraftMenu,
    chooseCraftMode,
    toggleModelMenu,
    closeModelMenu,
    toggleSkillMenu,
    closeSkillMenu,
    handleClickOutsideMenus,
  };
}

import { ref } from "vue";
import { loadingPhases } from "../constants";

export function useLoadingState() {
  const loading = ref(false);
  const loadingText = ref("");
  const loadingPhase = ref("");

  let loadingPhaseTimer: number | null = null;

  function startLoadingState(baseText: string): void {
    loading.value = true;
    loadingText.value = baseText;
    loadingPhase.value = loadingPhases[0];

    let phaseIndex = 0;
    loadingPhaseTimer = window.setInterval(() => {
      phaseIndex = (phaseIndex + 1) % loadingPhases.length;
      loadingPhase.value = loadingPhases[phaseIndex];
    }, 1200);
  }

  function stopLoadingState(): void {
    if (loadingPhaseTimer) {
      clearInterval(loadingPhaseTimer);
      loadingPhaseTimer = null;
    }

    loading.value = false;
  }

  return {
    loading,
    loadingText,
    loadingPhase,
    startLoadingState,
    stopLoadingState,
  };
}

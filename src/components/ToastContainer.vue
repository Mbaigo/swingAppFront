<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const getBgClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-600 border-emerald-500'
    case 'error':
      return 'bg-red-600 border-red-500'
    case 'warning':
      return 'bg-amber-600 border-amber-500'
    default:
      return 'bg-blue-600 border-blue-500'
  }
}
</script>

<template>
  <!-- Modification ici : left-1/2 et -translate-x-1/2 pour centrer parfaitement -->
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center justify-between gap-4 px-4 py-3 text-white text-sm font-medium rounded-lg shadow-lg border min-w-[300px] max-w-[90vw]"
        :class="getBgClass(toast.type)"
      >
        <span class="text-center flex-1">{{ toast.message }}</span>
        <button
          @click="removeToast(toast.id)"
          class="text-white/70 hover:text-white transition-colors flex-shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
/* Modification de l'animation : glisse vers le bas (translateY) au lieu de la droite */
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>

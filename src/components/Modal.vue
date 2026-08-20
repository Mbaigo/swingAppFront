<!-- src/components/Modal.vue -->
<script setup lang="ts">
// Définition des propriétés que le parent peut passer au Modal
defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: 'Modal',
  },
})

// Définition des événements que le Modal peut renvoyer au parent
const emit = defineEmits(['close'])
</script>

<template>
  <!-- Transition pour l'animation d'apparition/disparition -->
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <!-- Fond grisé cliquable pour fermer -->
      <div
        class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      ></div>

      <!-- Conteneur du Modal -->
      <div
        class="relative bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-lg flex flex-col max-h-[90vh]"
      >
        <!-- En-tête (Header) -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
          <button
            @click="emit('close')"
            class="text-slate-400 hover:text-white transition-colors p-1"
          >
            <!-- Icône Croix (X) SVG -->
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <!-- Corps (Body) - Le contenu dynamique s'injecte ici -->
        <div class="px-6 py-4 overflow-y-auto">
          <slot></slot>
        </div>

        <!-- Pied de page (Footer) - Optionnel -->
        <div
          class="px-6 py-4 border-t border-slate-700 bg-slate-900/50 rounded-b-xl flex justify-end space-x-3"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Classes pour l'animation Vue <Transition> */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

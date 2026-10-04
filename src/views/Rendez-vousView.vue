<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { commandeService } from '@/services/commandeService'
import type { Commande } from '@/types/commandeInterface'
import Modal from '@/components/Modal.vue'

// --- VARIABLES D'ÉTAT ---
const commandes = ref<Commande[]>([])
const isLoading = ref(false)
const currentPage = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)

// Filtre temporel actif (Onglets)
type Periode = 'AUJOURDHUI' | 'SEMAINE' | 'MOIS'
const activeTab = ref<Periode>('AUJOURDHUI')

// Variables pour le Modal de détails
const isViewModalOpen = ref(false)
const selectedCommande = ref<Commande | null>(null)

// --- LOGIQUE API (Basée sur tes endpoints) ---
const chargerLivraisons = async (page: number = 0) => {
  isLoading.value = true
  try {
    let response

    // On appelle le bon endpoint selon l'onglet actif
    if (activeTab.value === 'AUJOURDHUI') {
      response = await commandeService.getCommandesALivrerAujourdhui(page, 10)
    } else if (activeTab.value === 'SEMAINE') {
      response = await commandeService.getCommandesALivrerCetteSemaine(page, 10)
    } else if (activeTab.value === 'MOIS') {
      const now = new Date()
      // getCommandesParMois prend (annee, mois, page, size)
      // Attention: getMonth() renvoie 0-11 en JS, ton API Java attend probablement 1-12
      response = await commandeService.getCommandesParMois(
        now.getFullYear(),
        now.getMonth() + 1,
        page,
        10,
      )
    }

    if (response) {
      commandes.value = response.data.content
      totalPages.value = response.data.totalPages
      totalElements.value = response.data.totalElements
      currentPage.value = response.data.number
    }
  } catch (error) {
    console.error("Erreur lors du chargement de l'agenda", error)
  } finally {
    isLoading.value = false
  }
}

// Relancer l'API automatiquement dès qu'on change d'onglet
watch(activeTab, () => {
  chargerLivraisons(0)
})

// --- ACTIONS UI ---
const ouvrirDetails = (commande: Commande) => {
  selectedCommande.value = commande
  isViewModalOpen.value = true
}

// --- UTILITAIRES D'AFFICHAGE ---
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const getBadgeClass = (statut: string) => {
  switch (statut) {
    case 'CREEE':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    case 'EN_CONFECTION':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    case 'ESSAYAGE':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    case 'TERMINEE':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    case 'ANNULEE':
      return 'bg-red-500/20 text-red-400 border border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400'
  }
}

onMounted(() => {
  chargerLivraisons(0)
})
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div>
      <h1 class="text-2xl font-bold text-gray-300">Agenda & Livraisons</h1>
      <p class="text-gray-400 text-sm">Suivi des échéances et rendez-vous clients</p>
    </div>

    <!-- Onglets de navigation (Tabs) -->
    <div class="flex space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700 w-fit">
      <button
        @click="activeTab = 'AUJOURDHUI'"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          activeTab === 'AUJOURDHUI'
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-400 hover:text-white hover:bg-slate-700',
        ]"
      >
        À livrer Aujourd'hui
      </button>
      <button
        @click="activeTab = 'SEMAINE'"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          activeTab === 'SEMAINE'
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-400 hover:text-white hover:bg-slate-700',
        ]"
      >
        Cette Semaine
      </button>
      <button
        @click="activeTab = 'MOIS'"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          activeTab === 'MOIS'
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-400 hover:text-white hover:bg-slate-700',
        ]"
      >
        Commandes du Mois
      </button>
    </div>

    <!-- Tableau de l'Agenda -->
    <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <!-- En-tête du tableau d'information rapide -->
      <div
        class="px-6 py-4 border-b border-slate-700 bg-slate-900/30 flex justify-between items-center"
      >
        <h3 class="text-white font-medium">
          Résultats pour :
          <span v-if="activeTab === 'AUJOURDHUI'" class="text-blue-400">Ce jour</span>
          <span v-else-if="activeTab === 'SEMAINE'" class="text-blue-400">Cette semaine</span>
          <span v-else class="text-blue-400">Mois en cours</span>
        </h3>
        <span
          class="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-600"
        >
          {{ totalElements }} rendez-vous
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-300">
          <thead class="bg-slate-900/50 text-gray-400 uppercase text-xs font-semibold">
            <tr>
              <th scope="col" class="px-6 py-4">Commande</th>
              <th scope="col" class="px-6 py-4">Client</th>
              <th scope="col" class="px-6 py-4 text-blue-300">Date Prévue</th>
              <th scope="col" class="px-6 py-4">Statut actuel</th>
              <th scope="col" class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="5" class="px-6 py-8 text-center text-slate-500 animate-pulse">
                Recherche des échéances...
              </td>
            </tr>
            <tr v-else-if="commandes.length === 0">
              <td colspan="5" class="px-6 py-12 text-center">
                <p class="text-slate-400 text-lg mb-2">
                  🎉 Aucun rendez-vous ou livraison prévue !
                </p>
                <p class="text-slate-500 text-sm">Votre planning est dégagé pour cette période.</p>
              </td>
            </tr>
            <tr
              v-else
              v-for="commande in commandes"
              :key="commande.id"
              class="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
            >
              <td class="px-6 py-4 font-medium text-emerald-400 capitalize">
                {{ formatDate(commande.dateCreation) }}
              </td>
              <td class="px-6 py-4">
                {{
                  commande.client
                    ? commande.client.nom + ' ' + commande.client.prenom
                    : 'Non fourni'
                }}
              </td>
              <td class="px-6 py-4 font-medium text-emerald-400 capitalize">
                {{ formatDate(commande.dateLivraison) }}
              </td>

              <td class="px-6 py-4">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium',
                    getBadgeClass(commande.statut),
                  ]"
                >
                  {{ commande.statut.replace('_', ' ') }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  @click="ouvrirDetails(commande)"
                  class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors font-medium text-xs border border-slate-600"
                >
                  Voir le dossier
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="p-4 border-t border-slate-700 flex justify-between items-center text-sm text-gray-400"
      >
        <span>Page {{ currentPage + 1 }} sur {{ totalPages }}</span>
        <div class="space-x-2">
          <button
            @click="chargerLivraisons(currentPage - 1)"
            :disabled="currentPage === 0 || isLoading"
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            Précédent
          </button>
          <button
            @click="chargerLivraisons(currentPage + 1)"
            :disabled="currentPage === totalPages - 1 || isLoading"
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE DÉTAILS RAPIDES (Lecture seule) -->
    <Modal
      :isOpen="isViewModalOpen"
      title="Détails du Rendez-vous"
      @close="isViewModalOpen = false"
    >
      <div v-if="selectedCommande" class="space-y-6">
        <div
          class="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex items-center justify-between"
        >
          <div>
            <h4 class="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-1">
              Échéance
            </h4>
            <p class="text-white text-lg capitalize">
              {{ formatDate(selectedCommande.dateLivraison) }}
            </p>
          </div>
          <div class="text-right">
            <span
              :class="[
                'px-3 py-1 rounded-full text-sm font-medium',
                getBadgeClass(selectedCommande.statut),
              ]"
            >
              {{ selectedCommande.statut.replace('_', ' ') }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-y-4">
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase">Commande</span>
            <span class="text-white"
              >#{{ selectedCommande.id }} (Total: {{ selectedCommande.coutTotal }} XAF)</span
            >
          </div>
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase">Client</span>
            <span class="text-white">{{
              selectedCommande.client
                ? selectedCommande.client.nom +
                  ' ' +
                  selectedCommande.client.prenom +
                  ' ' +
                  selectedCommande.client.telephone
                : 'Non fourni'
            }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="isViewModalOpen = false"
          class="px-4 py-2 text-sm font-medium text-white bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600"
        >
          Fermer
        </button>
      </template>
    </Modal>
  </div>
</template>

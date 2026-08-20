<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { commandeService } from '@/services/commandeService'

interface Commande {
  id: number
  dateCreation: string
  dateLivraisonPrevue: string
  statut: string
  coutTotal: number
  nomClient?: string
}

// --- VARIABLES D'ÉTAT ---
const commandes = ref<Commande[]>([])
const isLoading = ref(false)
const currentPage = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)

// Variables liées aux filtres (v-model)
const searchQuery = ref('')
const selectedStatut = ref('')

// --- LOGIQUE API ---
const chargerCommandes = async (page: number) => {
  isLoading.value = true
  try {
    // Appelle le service en lui passant le statut actuel du menu déroulant
    const response = await commandeService.getCommandesFiltrees(page, 10, selectedStatut.value)
    commandes.value = response.data.content
    totalPages.value = response.data.totalPages
    totalElements.value = response.data.totalElements
    currentPage.value = response.data.number
  } catch (error) {
    console.error('Erreur de chargement des commandes', error)
  } finally {
    isLoading.value = false
  }
}

// ÉCOUTEUR : Si on change de statut dans le menu déroulant, on relance l'API (à la page 0)
watch(selectedStatut, () => {
  chargerCommandes(0)
})

// --- FILTRE LOCAL (Barre de recherche) ---
// Filtre instantanément par ID les résultats déjà chargés en mémoire
const commandesAffichees = computed(() => {
  if (!searchQuery.value) return commandes.value

  const query = searchQuery.value.toLowerCase()
  return commandes.value.filter((commande) => commande.id.toString().includes(query))
})

// --- UTILITAIRES D'AFFICHAGE ---
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('fr-FR')
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

// Initialisation
onMounted(() => {
  chargerCommandes(0)
})
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-300">Commandes</h1>
        <p class="text-gray-400 text-sm">{{ totalElements }} commandes au total</p>
      </div>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
      >
        <span>+</span> Nouvelle Commande
      </button>
    </div>

    <!-- Filtres avec v-model connectés aux variables du script -->
    <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Chercher par ID (#)..."
        class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 w-64 outline-none focus:border-blue-500"
      />

      <select
        v-model="selectedStatut"
        class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
      >
        <option value="">Tous les statuts</option>
        <option value="CREEE">Créées</option>
        <option value="EN_CONFECTION">En confection</option>
        <option value="ESSAYAGE">Essayage</option>
        <option value="TERMINEE">Terminées</option>
      </select>
    </div>

    <!-- Tableau Principal -->
    <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-300">
          <thead class="bg-slate-900/50 text-gray-400 uppercase text-xs font-semibold">
            <tr>
              <th scope="col" class="px-6 py-4">ID</th>
              <th scope="col" class="px-6 py-4">Date de création</th>
              <th scope="col" class="px-6 py-4">Livraison prévue</th>
              <th scope="col" class="px-6 py-4">Total</th>
              <th scope="col" class="px-6 py-4">Statut</th>
              <th scope="col" class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="6" class="px-6 py-8 text-center text-slate-500 animate-pulse">
                Chargement en cours...
              </td>
            </tr>
            <tr v-else-if="commandesAffichees.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-slate-500">
                Aucune commande ne correspond aux filtres.
              </td>
            </tr>
            <!-- Boucle sur commandesAffichees pour que la recherche instantanée fonctionne -->
            <tr
              v-else
              v-for="commande in commandesAffichees"
              :key="commande.id"
              class="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
            >
              <td class="px-6 py-4 font-medium text-white">#{{ commande.id }}</td>
              <td class="px-6 py-4">{{ formatDate(commande.dateCreation) }}</td>
              <td class="px-6 py-4">{{ formatDate(commande.dateLivraisonPrevue) }}</td>
              <td class="px-6 py-4 font-medium text-white">{{ commande.coutTotal }} XAF</td>
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
              <td class="px-6 py-4 text-right space-x-3">
                <button class="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Voir
                </button>
                <button class="text-gray-400 hover:text-gray-300 transition-colors font-medium">
                  Éditer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="p-4 border-t border-slate-700 flex justify-between items-center text-sm text-gray-400"
      >
        <span>Page {{ currentPage + 1 }} sur {{ totalPages }}</span>
        <div class="space-x-2">
          <button
            @click="chargerCommandes(currentPage - 1)"
            :disabled="currentPage === 0 || isLoading"
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>
          <button
            @click="chargerCommandes(currentPage + 1)"
            :disabled="currentPage === totalPages - 1 || isLoading || totalPages === 0"
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

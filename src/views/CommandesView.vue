<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { commandeService } from '@/services/commandeService'
import { clientService } from '@/services/clientService'
import Modal from '@/components/Modal.vue'

// Import de tes interfaces (ajuste le chemin si nécessaire)
import type { Commande } from '@/types/commandeInterface'
import type { ClientResponseDTO } from '@/types/clientInterface'

// --- VARIABLES D'ÉTAT ---
const commandes = ref<Commande[]>([])
const clientsList = ref<ClientResponseDTO[]>([]) // Stocke les clients pour le select
const isLoading = ref(false)
const currentPage = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)

// Variables liées aux filtres (v-model)
const searchQuery = ref('')
const selectedStatut = ref('')

// --- GESTION DES MODAUX ---
const isModalOpen = ref(false)
const isViewModalOpen = ref(false) // Pour le modal de consultation
const isSubmitting = ref(false)

const isEditMode = ref(false)
const currentCommandeId = ref<number | null>(null)
const selectedCommande = ref<Commande | null>(null)

// Modèle de données pour le formulaire (Création / Édition)
const commandeForm = ref({
  dateLivraisonPrevue: '',
  coutTotal: 0,
  clientId: '' as number | '',
  statut: 'CREEE',
})

// --- LOGIQUE API ---

// 1. Charger les commandes
const chargerCommandes = async (page: number) => {
  isLoading.value = true
  try {
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

// 2. Charger les clients pour le select du formulaire
const chargerClientsPourSelect = async () => {
  try {
    const response = await clientService.getAllClients(0, 100)
    clientsList.value = response.data.content
  } catch (error) {
    console.error('Erreur de chargement des clients', error)
  }
}

// ÉCOUTEUR : Si on change de statut dans le menu déroulant, on relance l'API (à la page 0)
watch(selectedStatut, () => {
  chargerCommandes(0)
})

// --- ACTIONS SUR LES BOUTONS ---

const ouvrirModalCreation = () => {
  isEditMode.value = false
  currentCommandeId.value = null
  commandeForm.value = { dateLivraisonPrevue: '', coutTotal: 0, clientId: '', statut: 'CREEE' }
  isModalOpen.value = true
}

const ouvrirModalEdition = (commande: Commande) => {
  isEditMode.value = true
  currentCommandeId.value = commande.id

  // L'input datetime-local de HTML5 attend un format YYYY-MM-DDTHH:mm (sans les secondes)
  const dateFormatee = commande.dateLivraisonPrevue ? commande.dateLivraisonPrevue.slice(0, 16) : ''

  commandeForm.value = {
    dateLivraisonPrevue: dateFormatee,
    coutTotal: commande.coutTotal,
    // Note: Si ton backend renvoie le clientId dans la réponse de la commande,
    // tu pourrais le pré-remplir ici (ex: commande.clientId || '').
    // Sinon, on oblige l'utilisateur à le resélectionner.
    clientId: '',
    statut: commande.statut,
  }
  isModalOpen.value = true
}

const ouvrirModalDetails = (commande: Commande) => {
  selectedCommande.value = commande
  isViewModalOpen.value = true
}

// --- SOUMISSION DU FORMULAIRE ---
const soumettreCommande = async () => {
  isSubmitting.value = true
  try {
    if (isEditMode.value && currentCommandeId.value) {
      // Si on est en mode édition, on appelle le PUT
      await commandeService.updateCommande(currentCommandeId.value, commandeForm.value)
    } else {
      // Sinon on crée avec un POST
      await commandeService.creerCommande(commandeForm.value)
    }

    isModalOpen.value = false
    chargerCommandes(currentPage.value) // Recharge la page courante
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la commande', error)
  } finally {
    isSubmitting.value = false
  }
}

// --- FILTRE LOCAL (Barre de recherche) ---
const commandesAffichees = computed(() => {
  if (!searchQuery.value) return commandes.value

  const query = searchQuery.value.toLowerCase()
  return commandes.value.filter((commande) => commande.id.toString().includes(query))
})

// --- UTILITAIRES D'AFFICHAGE ---
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

// Initialisation
onMounted(() => {
  chargerCommandes(0)
  chargerClientsPourSelect()
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
        @click="ouvrirModalCreation"
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
        <option value="ANNULEE">Annulées</option>
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
                <button
                  @click="ouvrirModalDetails(commande)"
                  class="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Voir
                </button>
                <button
                  @click="ouvrirModalEdition(commande)"
                  class="text-gray-400 hover:text-gray-300 transition-colors font-medium"
                >
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

    <!-- 1. MODAL DE CRÉATION / MODIFICATION -->
    <Modal
      :isOpen="isModalOpen"
      :title="
        isEditMode ? 'Modifier la commande #' + currentCommandeId : 'Créer une nouvelle commande'
      "
      @close="isModalOpen = false"
    >
      <form id="formCommande" @submit.prevent="soumettreCommande" class="space-y-4">
        <!-- Sélection du Client -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">Client *</label>
          <select
            v-model="commandeForm.clientId"
            required
            class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
          >
            <option value="" disabled>Sélectionnez un client...</option>
            <option v-for="client in clientsList" :key="client.id" :value="client.id">
              {{ client.nom }} {{ client.prenom }} ({{ client.telephone }})
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Date de livraison *</label>
            <input
              v-model="commandeForm.dateLivraisonPrevue"
              type="datetime-local"
              required
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Coût total (XAF) *</label>
            <input
              v-model="commandeForm.coutTotal"
              type="number"
              required
              min="0"
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Le Statut n'est modifiable qu'en mode édition -->
        <div v-if="isEditMode">
          <label class="block text-sm font-medium text-slate-300 mb-1">Statut de la commande</label>
          <select
            v-model="commandeForm.statut"
            required
            class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
          >
            <option value="CREEE">Créée</option>
            <option value="EN_CONFECTION">En confection</option>
            <option value="ESSAYAGE">Essayage</option>
            <option value="TERMINEE">Terminée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="isModalOpen = false"
          class="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          form="formCommande"
          :disabled="isSubmitting"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <span v-if="isSubmitting">Sauvegarde...</span>
          <span v-else>{{ isEditMode ? 'Mettre à jour' : 'Enregistrer' }}</span>
        </button>
      </template>
    </Modal>

    <!-- 2. MODAL DE CONSULTATION (DÉTAILS) -->
    <Modal
      :isOpen="isViewModalOpen"
      title="Détails de la commande"
      @close="isViewModalOpen = false"
    >
      <div v-if="selectedCommande" class="space-y-6">
        <!-- En-tête de la commande -->
        <div class="flex items-center justify-between border-b border-slate-700 pb-4">
          <div>
            <h3 class="text-2xl font-bold text-white">Commande #{{ selectedCommande.id }}</h3>
            <p class="text-slate-400 text-sm">
              Créée le {{ formatDate(selectedCommande.dateCreation) }}
            </p>
          </div>
          <span
            :class="[
              'px-3 py-1 rounded-full text-sm font-medium',
              getBadgeClass(selectedCommande.statut),
            ]"
          >
            {{ selectedCommande.statut.replace('_', ' ') }}
          </span>
        </div>

        <!-- Informations clés -->
        <div
          class="grid grid-cols-2 gap-y-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700"
        >
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase mb-1">Client</span>
            <!-- Affiche le nom s'il existe dans le DTO, sinon fallback -->
            <span class="text-white font-medium">{{
              selectedCommande.nomClient || 'ID Client non fourni'
            }}</span>
          </div>
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase mb-1"
              >Livraison prévue</span
            >
            <span class="text-white">{{ formatDate(selectedCommande.dateLivraisonPrevue) }}</span>
          </div>
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase mb-1"
              >Coût Total</span
            >
            <span class="text-white text-lg font-bold text-emerald-400"
              >{{ selectedCommande.coutTotal }} XAF</span
            >
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="isViewModalOpen = false"
          class="px-4 py-2 text-sm font-medium text-white bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Fermer
        </button>
      </template>
    </Modal>
  </div>
</template>

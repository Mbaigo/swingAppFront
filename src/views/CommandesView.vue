<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { commandeService } from '@/services/commandeService'
import { clientService } from '@/services/clientService'
import Modal from '@/components/Modal.vue'

// Assure-toi que ces types correspondent à ce qui est dans ton fichier commandeInterface.ts
import type { Commande, CommandeRequest, LigneCommandeRequest } from '@/types/commandeInterface'
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
  clientId: '' as number | '',
  dateLivraison: '',
  lignes: [] as LigneCommandeRequest[],
  statut: 'CREEE',
})

// --- GESTION DYNAMIQUE DES LIGNES ---
const ajouterLigne = () => {
  commandeForm.value.lignes.push({
    nomMaquette: '',
    imagesUrl: [],
    quantite: 1,
    prixConfection: 0,
  })
}

const supprimerLigne = (index: number) => {
  if (commandeForm.value.lignes.length > 1) {
    commandeForm.value.lignes.splice(index, 1)
  }
}

// Calcul automatique du total pour l'affichage UI
const totalEstime = computed(() => {
  return commandeForm.value.lignes.reduce((total, ligne) => {
    return total + (ligne.quantite || 0) * (ligne.prixConfection || 0)
  }, 0)
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

  // On réinitialise avec 1 ligne par défaut
  commandeForm.value = {
    clientId: '',
    dateLivraison: '',
    lignes: [{ nomMaquette: '', imagesUrl: [], quantite: 1, prixConfection: 0 }],
    statut: 'CREEE',
  }
  isModalOpen.value = true
}

const ouvrirModalEdition = (commande: Commande) => {
  isEditMode.value = true
  currentCommandeId.value = commande.id

  // On extrait juste la partie YYYY-MM-DD pour l'input type="date"
  const dateFormatee = commande.dateLivraison ? commande.dateLivraison.slice(0, 10) : ''

  commandeForm.value = {
    // 👈 ICI : On pré-remplit avec l'ID du client existant
    clientId: commande.client ? commande.client.id : '',
    dateLivraison: dateFormatee,
    // Si ton backend renvoie les lignes existantes, mets-les ici, sinon crée une ligne par défaut
    lignes: (commande as any).lignes
      ? JSON.parse(JSON.stringify((commande as any).lignes))
      : [{ nomMaquette: '', imagesUrl: [], quantite: 1, prixConfection: commande.coutTotal || 0 }],
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
      await commandeService.updateCommande(currentCommandeId.value, commandeForm.value)
    } else {
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
              <td class="px-6 py-4">{{ formatDate(commande.dateCommande) }}</td>
              <td class="px-6 py-4">{{ formatDate(commande.dateLivraison) }}</td>
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
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            Précédent
          </button>
          <button
            @click="chargerCommandes(currentPage + 1)"
            :disabled="currentPage === totalPages - 1 || isLoading || totalPages === 0"
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 transition-colors"
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
        <div class="grid grid-cols-2 gap-4">
          <!-- Sélection du Client -->
          <!-- Sélection du Client -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Client *</label>
            <select
              v-model="commandeForm.clientId"
              required
              :disabled="isEditMode"
              :class="[
                'w-full text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors',
                isEditMode
                  ? 'bg-slate-700/50 border border-slate-600 text-slate-400 cursor-not-allowed opacity-70'
                  : 'bg-slate-700 border border-slate-600 text-white',
              ]"
            >
              <option value="" disabled>Sélectionnez un client...</option>
              <option v-for="client in clientsList" :key="client.id" :value="client.id">
                {{ client.nom }} {{ client.prenom }} ({{ client.telephone }})
              </option>
            </select>
          </div>

          <!-- Date de Livraison -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Date de livraison *</label>
            <input
              v-model="commandeForm.dateLivraison"
              type="date"
              required
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

        <!-- SECTION : LIGNES DE COMMANDE -->
        <div class="mt-6 pt-4 border-t border-slate-700">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-semibold text-white uppercase tracking-wider">
              Articles à confectionner
            </h4>
            <span
              class="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20"
            >
              Total estimé : {{ totalEstime }} XAF
            </span>
          </div>

          <!-- Boucle sur les lignes -->
          <div
            v-for="(ligne, index) in commandeForm.lignes"
            :key="index"
            class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-3 relative group"
          >
            <!-- Bouton de suppression de ligne -->
            <button
              v-if="commandeForm.lignes.length > 1"
              @click.prevent="supprimerLigne(index)"
              class="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100"
              title="Retirer cet article"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>

            <div class="grid grid-cols-12 gap-3 mt-2">
              <div class="col-span-12 sm:col-span-6">
                <label class="block text-xs font-medium text-slate-400 mb-1"
                  >Nom de la maquette / Modèle *</label
                >
                <input
                  v-model="ligne.nomMaquette"
                  type="text"
                  required
                  placeholder="Ex: Robe de soirée"
                  class="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
                />
              </div>

              <div class="col-span-6 sm:col-span-2">
                <label class="block text-xs font-medium text-slate-400 mb-1">Quantité *</label>
                <input
                  v-model="ligne.quantite"
                  type="number"
                  required
                  min="1"
                  class="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
                />
              </div>

              <div class="col-span-6 sm:col-span-4">
                <label class="block text-xs font-medium text-slate-400 mb-1"
                  >Prix unitaire (XAF) *</label
                >
                <input
                  v-model="ligne.prixConfection"
                  type="number"
                  required
                  min="0"
                  class="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Bouton Ajouter une ligne -->
          <button
            @click.prevent="ajouterLigne"
            class="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-2"
          >
            <span class="text-lg font-bold">+</span> Ajouter un autre article
          </button>
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

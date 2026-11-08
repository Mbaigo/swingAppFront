<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { clientService } from '@/services/clientService'
import type { ClientResponseDTO, ClientRequestDTO, Genre } from '@/types/clientInterface'
import Modal from '@/components/Modal.vue'

import { ficheMesureService } from '@/services/ficheMesureService'
import { useToast } from '@/composables/useToast'
import type {
  FicheMesureRequest,
  FicheMesureResponse,
  MensurationsMap,
} from '@/types/ficheMesureInterface'

const toast = useToast()

// --- VARIABLES D'ÉTAT ---
const clients = ref<ClientResponseDTO[]>([])
const isLoading = ref(false)
const currentPage = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)

// Variables liées aux filtres
const searchQuery = ref('')
const selectedGenre = ref<Genre | ''>('')

// --- GESTION DES MODAUX ---
const isModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isSubmitting = ref(false)

const isEditMode = ref(false)
const currentClientId = ref<number | null>(null)
const selectedClient = ref<ClientResponseDTO | null>(null)

// Modèle de données pour le formulaire
const clientForm = ref<ClientRequestDTO>({
  nom: '',
  prenom: '',
  telephone: '',
  email: '',
  genre: 'HOMME',
  notesMorphologie: '',
})

// --- ACTIONS SUR LES BOUTONS ---
const ouvrirModalCreation = () => {
  isEditMode.value = false
  currentClientId.value = null
  clientForm.value = {
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    genre: 'HOMME',
    notesMorphologie: '',
  }
  isModalOpen.value = true
}

const ouvrirModalEdition = (client: ClientResponseDTO) => {
  isEditMode.value = true
  currentClientId.value = client.id
  clientForm.value = {
    nom: client.nom,
    prenom: client.prenom,
    telephone: client.telephone,
    email: client.email || '',
    genre: client.genre,
    notesMorphologie: client.notesMorphologie || '',
  }
  isModalOpen.value = true
}

const ouvrirModalDetails = async (client: ClientResponseDTO) => {
  selectedClient.value = client
  isViewModalOpen.value = true
  try {
    const response = await clientService.getClientById(client.id)
    selectedClient.value = response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des détails', error)
  }
}

// --- SOUMISSION DU FORMULAIRE (Unique et correcte) ---
const soumettreClient = async () => {
  isSubmitting.value = true
  try {
    if (isEditMode.value && currentClientId.value) {
      await clientService.updateClient(currentClientId.value, clientForm.value)
    } else {
      await clientService.createClient(clientForm.value)
    }

    isModalOpen.value = false
    chargerClients(currentPage.value)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du client', error)
  } finally {
    isSubmitting.value = false
  }
}

// --- LOGIQUE API ---
const chargerClients = async (page: number) => {
  isLoading.value = true
  try {
    const response = await clientService.getAllClients(page, 10)
    clients.value = response.data.content
    totalPages.value = response.data.totalPages
    totalElements.value = response.data.totalElements
    currentPage.value = response.data.number
  } catch (error) {
    console.error('Erreur de chargement des clients', error)
  } finally {
    isLoading.value = false
  }
}

// --- FILTRES LOCAUX ---
const clientsAffiches = computed(() => {
  let result = clients.value
  if (selectedGenre.value) {
    result = result.filter((client) => client.genre === selectedGenre.value)
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (client) =>
        client.nom.toLowerCase().includes(query) ||
        client.prenom.toLowerCase().includes(query) ||
        client.telephone.includes(query),
    )
  }
  return result
})

// --- UTILITAIRES D'AFFICHAGE ---
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('fr-FR')
}

const getBadgeClass = (genre: Genre) => {
  switch (genre) {
    case 'HOMME':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    case 'FEMME':
      return 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
    case 'ADO':
      return 'bg-green-500/20 text-green-400 border border-green-500/30'
    case 'ENFANT':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400'
  }
}

// ==========================================
// GESTION DES FICHES DE MESURE (MENSURATIONS)
// ==========================================

const isFichesModalOpen = ref(false)
const isFichesLoading = ref(false)
const selectedClientPourFiches = ref<any>(null)
const historiqueFiches = ref<FicheMesureResponse[]>([])

// État du formulaire
const isCreatingNewFiche = ref(false)

// L'objet formulaire principal lié à la fiche
const ficheForm = ref<{
  id?: number
  nomProjet: string
  remarquesSpecifiques: string
  mesures: MensurationsMap
}>({
  nomProjet: '',
  remarquesSpecifiques: '',
  mesures: {},
})

// Tableau réactif pour gérer les champs dynamiques (Lignes de mesures dans l'UI)
const mesuresUI = ref<{ cle: string; valeur: number | '' }[]>([])

// Ouvre le grand modal des fiches et charge l'historique
const ouvrirModalFiches = async (client: any) => {
  selectedClientPourFiches.value = client
  isFichesModalOpen.value = true
  isFichesLoading.value = true
  historiqueFiches.value = []

  try {
    const response = await ficheMesureService.getFichesByClientId(client.id)
    historiqueFiches.value = response.data

    if (historiqueFiches.value.length > 0) {
      // 👈 CORRECTION ICI : Extraction propre pour satisfaire le compilateur TypeScript
      const premiereFiche = historiqueFiches.value[0]
      if (premiereFiche) {
        selectionnerFiche(premiereFiche)
      }
    } else {
      // Si aucune fiche, on passe directement en mode création
      preparerNouvelleFiche()
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      preparerNouvelleFiche()
    } else {
      console.error('Erreur récupération fiches', error)
    }
  } finally {
    isFichesLoading.value = false
  }
}

// Prépare le formulaire pour une TOUTE NOUVELLE fiche
const preparerNouvelleFiche = () => {
  isCreatingNewFiche.value = true
  ficheForm.value = {
    nomProjet: '',
    remarquesSpecifiques: '',
    mesures: {},
  }
  // On insère 3 lignes vides par défaut pour faire gagner du temps au tailleur
  mesuresUI.value = [
    { cle: '', valeur: '' },
    { cle: '', valeur: '' },
    { cle: '', valeur: '' },
  ]
}

// Charge une fiche EXISTANTE dans le formulaire pour lecture/modification
const selectionnerFiche = (fiche: FicheMesureResponse) => {
  isCreatingNewFiche.value = false
  ficheForm.value = {
    id: fiche.id,
    nomProjet: fiche.nomProjet,
    remarquesSpecifiques: fiche.remarquesSpecifiques || '',
    mesures: { ...fiche.mesures },
  }

  // Transformation de l'objet JSON { "Cou": 40, "Poitrine": 100 }
  // en tableau d'objets [{cle: "Cou", valeur: 40}, {cle: "Poitrine", valeur: 100}] pour le v-for Vue.js
  if (fiche.mesures && Object.keys(fiche.mesures).length > 0) {
    mesuresUI.value = Object.entries(fiche.mesures).map(([cle, valeur]) => ({ cle, valeur }))
  } else {
    mesuresUI.value = []
  }
}

// --- ACTIONS DYNAMIQUES DU FORMULAIRE ---
const ajouterLigneMesure = () => {
  mesuresUI.value.push({ cle: '', valeur: '' })
}

const supprimerLigneMesure = (index: number) => {
  mesuresUI.value.splice(index, 1)
}

// --- SAUVEGARDE EN BASE DE DONNÉES ---
const sauvegarderFiche = async () => {
  if (!selectedClientPourFiches.value || !ficheForm.value.nomProjet) return

  // 🔒 Formatage strict : On reconstruit le Map pour le Backend
  const mesuresMapPourBackend: Record<string, number> = {}

  mesuresUI.value.forEach((ligne) => {
    // On ignore silencieusement les lignes que le tailleur a laissées vides
    if (ligne.cle.trim() !== '' && ligne.valeur !== '' && ligne.valeur !== null) {
      // Capitalisation de la première lettre pour que ce soit joli et uniforme (ex: "cou" -> "Cou")
      const clePropre = ligne.cle.trim().charAt(0).toUpperCase() + ligne.cle.trim().slice(1)
      mesuresMapPourBackend[clePropre] = Number(ligne.valeur)
    }
  })

  isFichesLoading.value = true

  try {
    const payload: FicheMesureRequest = {
      clientId: selectedClientPourFiches.value.id,
      nomProjet: ficheForm.value.nomProjet,
      remarquesSpecifiques: ficheForm.value.remarquesSpecifiques,
      mesures: mesuresMapPourBackend, // 👈 Le DTO Java reçoit un beau Map<String, Integer>
    }

    if (isCreatingNewFiche.value) {
      await ficheMesureService.createFicheMesure(payload)
      toast.success('Nouvelle fiche de mesures créée avec succès !')
    } else {
      await ficheMesureService.updateFicheMesure(ficheForm.value.id!, payload)
      toast.success('Fiche mise à jour avec succès !')
    }

    // Rafraîchissement automatique de la liste à gauche
    const response = await ficheMesureService.getFichesByClientId(selectedClientPourFiches.value.id)
    historiqueFiches.value = response.data

    // On resélectionne la fiche fraîchement créée/modifiée
    if (historiqueFiches.value.length > 0) {
      selectionnerFiche(historiqueFiches.value[0])
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la fiche de mesure :', error)
    toast.error("Impossible d'enregistrer la fiche. Vérifiez les informations.")
  } finally {
    isFichesLoading.value = false
  }
}

onMounted(() => {
  chargerClients(0)
})
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-300">Clients</h1>
        <p class="text-gray-400 text-sm">{{ totalElements }} clients au total</p>
      </div>
      <!-- Remplacer @click="isModalOpen = true" par ouvrirModalCreation() -->
      <button
        @click="ouvrirModalCreation"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
      >
        <span>+</span> Nouveau Client
      </button>
    </div>

    <!-- Filtres avec v-model connectés aux variables du script -->
    <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Chercher par nom, prénom ou tél..."
        class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 w-64 outline-none focus:border-blue-500"
      />

      <select
        v-model="selectedGenre"
        class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
      >
        <option value="">Tous les genres</option>
        <option value="HOMME">Homme</option>
        <option value="FEMME">Femme</option>
        <option value="ADO">Ado</option>
        <option value="ENFANT">Enfant</option>
      </select>
    </div>

    <!-- Tableau Principal -->
    <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-300">
          <thead class="bg-slate-900/50 text-gray-400 uppercase text-xs font-semibold">
            <tr>
              <th scope="col" class="px-6 py-4">ID</th>
              <th scope="col" class="px-6 py-4">Nom & Prénom</th>
              <th scope="col" class="px-6 py-4">Téléphone</th>
              <th scope="col" class="px-6 py-4">Email</th>
              <th scope="col" class="px-6 py-4">Genre</th>
              <th scope="col" class="px-6 py-4">Date d'ajout</th>
              <th scope="col" class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="7" class="px-6 py-8 text-center text-slate-500 animate-pulse">
                Chargement en cours...
              </td>
            </tr>
            <tr v-else-if="clientsAffiches.length === 0">
              <td colspan="7" class="px-6 py-8 text-center text-slate-500">
                Aucun client ne correspond aux filtres.
              </td>
            </tr>
            <!-- Boucle sur clientsAffiches pour la recherche instantanée -->
            <tr
              v-else
              v-for="client in clientsAffiches"
              :key="client.id"
              class="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
            >
              <td class="px-6 py-4 font-medium text-white">#{{ client.id }}</td>
              <td class="px-6 py-4 font-medium text-white">{{ client.nom }} {{ client.prenom }}</td>
              <td class="px-6 py-4">{{ client.telephone }}</td>
              <td class="px-6 py-4">{{ client.email || '-' }}</td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium',
                    getBadgeClass(client.genre),
                  ]"
                >
                  {{ client.genre }}
                </span>
              </td>
              <td class="px-6 py-4">{{ formatDate(client.dateCreation) }}</td>
              <td class="px-6 py-4 text-right space-x-3">
                <button
                  @click="ouvrirModalDetails(client)"
                  class="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Voir
                </button>
                <button
                  @click="ouvrirModalEdition(client)"
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
            @click="chargerClients(currentPage - 1)"
            :disabled="currentPage === 0 || isLoading"
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>
          <button
            @click="chargerClients(currentPage + 1)"
            :disabled="currentPage === totalPages - 1 || isLoading || totalPages === 0"
            class="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
    <!-- 1. MODAL DE CRÉATION / MODIFICATION -->
    <!-- Le titre change dynamiquement grâce au v-bind (:) -->
    <Modal
      :isOpen="isModalOpen"
      :title="isEditMode ? 'Modifier le client' : 'Ajouter un nouveau client'"
      @close="isModalOpen = false"
    >
      <form id="formClient" @submit.prevent="soumettreClient" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Nom *</label>
            <input
              v-model="clientForm.nom"
              type="text"
              required
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Prénom *</label>
            <input
              v-model="clientForm.prenom"
              type="text"
              required
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Téléphone *</label>
            <input
              v-model="clientForm.telephone"
              type="tel"
              required
              placeholder="+237..."
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Genre</label>
            <select
              v-model="clientForm.genre"
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            >
              <option value="HOMME">Homme</option>
              <option value="FEMME">Femme</option>
              <option value="ADO">Ado</option>
              <option value="ENFANT">Enfant</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input
            v-model="clientForm.email"
            type="email"
            class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">Notes / Mensurations</label>
          <textarea
            v-model="clientForm.notesMorphologie"
            rows="3"
            placeholder="Détails sur la morphologie..."
            class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500 resize-none"
          ></textarea>
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
          form="formClient"
          :disabled="isSubmitting"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <span v-if="isSubmitting">Sauvegarde...</span>
          <span v-else>{{ isEditMode ? 'Mettre à jour' : 'Enregistrer' }}</span>
        </button>
      </template>
    </Modal>
    <!-- 2. MODAL DE CONSULTATION (DÉTAILS) -->
    <Modal :isOpen="isViewModalOpen" title="Détails du client" @close="isViewModalOpen = false">
      <div v-if="selectedClient" class="space-y-6">
        <!-- En-tête profil -->
        <div class="flex items-center gap-4 border-b border-slate-700 pb-4">
          <div
            class="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-2xl text-blue-400 font-bold uppercase"
          >
            {{ selectedClient.nom.charAt(0) }}{{ selectedClient.prenom.charAt(0) }}
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">
              {{ selectedClient.nom }} {{ selectedClient.prenom }}
            </h3>
            <p class="text-slate-400 text-sm">
              Client #{{ selectedClient.id }} • Ajouté le
              {{ formatDate(selectedClient.dateCreation) }}
            </p>
          </div>
        </div>

        <!-- Informations -->
        <div class="grid grid-cols-2 gap-y-4">
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase">Téléphone</span>
            <span class="text-white">{{ selectedClient.telephone }}</span>
          </div>
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase">Email</span>
            <span class="text-white">{{ selectedClient.email || 'Non renseigné' }}</span>
          </div>
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase">Genre</span>
            <span
              :class="[
                'px-2 py-1 rounded text-xs font-medium inline-block mt-1',
                getBadgeClass(selectedClient.genre),
              ]"
            >
              {{ selectedClient.genre }}
            </span>
          </div>
        </div>

        <!-- Bouton de gestion des fiches de mensurations (NOUVEAU) -->
        <div
          class="bg-slate-800 p-4 rounded-lg border border-emerald-900/50 flex items-center justify-between"
        >
          <div>
            <h4 class="text-white font-medium text-sm">Fiches techniques & Mesures</h4>
            <p class="text-xs text-slate-400 mt-1">Gérer les mensurations pour les projets.</p>
          </div>
          <button
            @click="ouvrirModalFiches(selectedClient)"
            class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
          >
            <span>📐</span> Gérer les fiches
          </button>
        </div>

        <!-- Notes (Morphologie globale) -->
        <div class="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <span class="block text-xs font-semibold text-slate-500 uppercase mb-2"
            >Notes générales / Morphologie</span
          >
          <p class="text-slate-300 text-sm whitespace-pre-line">
            {{ selectedClient.notesMorphologie || 'Aucune note générale enregistrée.' }}
          </p>
        </div>
      </div>

      <template #footer>
        <button
          @click="isViewModalOpen = false"
          class="px-4 py-2 text-sm font-medium text-white bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors w-full sm:w-auto"
        >
          Fermer le dossier
        </button>
      </template>
    </Modal>

    <!-- MODAL HISTORIQUE ET FICHES DE MESURES -->
    <Modal
      :isOpen="isFichesModalOpen"
      title="Dossier Mensurations"
      @close="isFichesModalOpen = false"
    >
      <div
        v-if="isFichesLoading && historiqueFiches.length === 0 && !isCreatingNewFiche"
        class="flex justify-center p-8"
      >
        <span class="text-slate-400">Chargement des données...</span>
      </div>

      <div v-else class="flex flex-col md:flex-row gap-6">
        <!-- COLONNE GAUCHE : HISTORIQUE -->
        <div class="w-full md:w-1/3 border-r border-slate-700 pr-0 md:pr-4 flex flex-col h-[550px]">
          <!-- 🚀 LE GROS BOUTON CRÉER EST ICI -->
          <button
            @click="preparerNouvelleFiche"
            class="w-full mb-4 px-4 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            :class="{ 'ring-2 ring-emerald-500': isCreatingNewFiche }"
          >
            <span>➕</span> Créer une fiche
          </button>

          <h4
            class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-700 pb-2"
          >
            Anciennes fiches ({{ historiqueFiches.length }})
          </h4>

          <!-- Liste scrollable de l'historique -->
          <ul class="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
            <li
              v-if="historiqueFiches.length === 0"
              class="text-xs text-slate-500 italic p-4 text-center bg-slate-800/50 rounded-lg"
            >
              Aucun historique pour ce client.
            </li>

            <li
              v-for="fiche in historiqueFiches"
              :key="fiche.id"
              @click="selectionnerFiche(fiche)"
              class="p-3 rounded-lg cursor-pointer transition-colors border"
              :class="
                !isCreatingNewFiche && ficheForm.id === fiche.id
                  ? 'bg-slate-700/50 border-blue-500/50 shadow-md'
                  : 'bg-slate-900 border-slate-700 hover:bg-slate-800'
              "
            >
              <div class="flex justify-between items-start mb-1">
                <span class="font-medium text-white text-sm line-clamp-1">{{
                  fiche.nomProjet
                }}</span>
              </div>
              <div class="text-xs text-slate-400 flex items-center gap-1">
                📅 {{ formatDate(fiche.datePrise) }}
              </div>
            </li>
          </ul>
        </div>

        <!-- COLONNE DROITE : LE FORMULAIRE -->
        <div class="w-full md:w-2/3 h-[550px] overflow-y-auto custom-scrollbar pr-2">
          <div
            class="flex justify-between items-center mb-4 border-b border-slate-700 pb-2 sticky top-0 bg-slate-900 z-10 pt-1"
          >
            <h3
              class="text-lg font-bold"
              :class="isCreatingNewFiche ? 'text-emerald-400' : 'text-blue-400'"
            >
              {{ isCreatingNewFiche ? '✨ Nouvelle fiche de mesures' : 'Détail de la fiche' }}
            </h3>
            <span
              v-if="!isCreatingNewFiche"
              class="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono border border-slate-700"
              >ID: {{ ficheForm.id }}</span
            >
          </div>

          <form @submit.prevent="sauvegarderFiche" class="space-y-5">
            <!-- Nom du Projet -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1"
                >Nom du projet / Type de vêtement *</label
              >
              <input
                v-model="ficheForm.nomProjet"
                type="text"
                required
                placeholder="Ex: Costume croisé, Chemise slim..."
                class="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
              />
            </div>

            <!-- NOUVEAU BLOC : Mesures Dynamiques -->
            <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-blue-400 text-sm font-semibold flex items-center gap-2">
                  <span>📏</span> Dimensions personnalisées (cm)
                </h4>
                <button
                  type="button"
                  @click="ajouterLigneMesure"
                  class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
                >
                  + Ajouter une mesure
                </button>
              </div>

              <!-- Lignes dynamiques -->
              <div class="space-y-3">
                <div
                  v-if="mesuresUI.length === 0"
                  class="text-center text-xs text-slate-500 italic py-2"
                >
                  Aucune mesure ajoutée. Cliquez sur "+ Ajouter une mesure".
                </div>

                <div
                  v-for="(ligne, index) in mesuresUI"
                  :key="index"
                  class="flex items-center gap-3"
                >
                  <!-- Champ Clé (Nom de la mesure) avec auto-complétion native HTML -->
                  <input
                    v-model="ligne.cle"
                    type="text"
                    placeholder="Sélectionnez ou tapez une mesure..."
                    list="suggestions-mesures"
                    class="w-3/5 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                  />

                  <!-- Champ Valeur (cm) -->
                  <input
                    v-model="ligne.valeur"
                    type="number"
                    step="0.5"
                    placeholder="Valeur (cm)"
                    class="w-2/5 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none text-center font-mono"
                  />

                  <!-- Bouton Supprimer -->
                  <button
                    type="button"
                    @click="supprimerLigneMesure(index)"
                    class="p-2 text-slate-500 hover:text-red-400 bg-slate-900 hover:bg-red-500/10 rounded-lg border border-slate-700 transition-colors"
                    title="Retirer cette ligne"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Suggestions pour aider la saisie rapide -->
              <datalist id="suggestions-mesures">
                <option value="Cou"></option>
                <option value="Épaules"></option>
                <option value="Poitrine"></option>
                <option value="Tour de taille"></option>
                <option value="Longueur manches"></option>
                <option value="Hanches"></option>
                <option value="Cuisses"></option>
                <option value="Longueur pantalon"></option>
                <option value="Tour de bras"></option>
              </datalist>
            </div>

            <!-- Observations -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1"
                >Observations / Morphologie</label
              >
              <textarea
                v-model="ficheForm.remarquesSpecifiques"
                rows="2"
                class="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                placeholder="Notes spécifiques à ce vêtement..."
              ></textarea>
            </div>

            <!-- Actions -->
            <div
              class="flex justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-900 pb-2"
            >
              <button
                type="button"
                @click="isFichesModalOpen = false"
                class="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Fermer
              </button>

              <button
                type="submit"
                :disabled="isFichesLoading"
                class="px-6 py-2 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
                :class="
                  isCreatingNewFiche
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                "
              >
                {{
                  isFichesLoading
                    ? 'Patientez...'
                    : isCreatingNewFiche
                      ? '✓ Enregistrer la fiche'
                      : 'Mettre à jour'
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  </div>
</template>

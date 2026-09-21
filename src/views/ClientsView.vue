<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { clientService } from '@/services/clientService'
import type { ClientResponseDTO, ClientRequestDTO, Genre } from '@/types/clientInterface'
import Modal from '@/components/Modal.vue'

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

        <!-- Notes (Mensurations) -->
        <div class="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <span class="block text-xs font-semibold text-slate-500 uppercase mb-2"
            >Mensurations & Notes</span
          >
          <p class="text-slate-300 text-sm whitespace-pre-line">
            {{ selectedClient.notesMorphologie || 'Aucune note enregistrée.' }}
          </p>
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

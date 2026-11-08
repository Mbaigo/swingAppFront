<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { fileUploadService } from '@/services/fileUploadService'
import { commandeService } from '@/services/commandeService'
import { clientService } from '@/services/clientService'
// Assure-toi que le composant Modal existe bien à cet emplacement
import Modal from '@/components/Modal.vue'
import { paiementService } from '@/services/paiementService'

// Types (Assure-toi de les avoir définis dans tes interfaces)
import type { Commande, CommandeRequest, LigneCommandeRequest } from '@/types/commandeInterface'
import type { ClientResponseDTO } from '@/types/clientInterface'

// --- GESTION DE LA VISIONNEUSE D'IMAGES (LIGHTBOX) ---
const isImageViewerOpen = ref(false)
const currentImageUrl = ref('')
const zoomLevel = ref(1)

const openImageViewer = (url: string) => {
  currentImageUrl.value = url
  zoomLevel.value = 1
  isImageViewerOpen.value = true
}

const closeImageViewer = () => {
  isImageViewerOpen.value = false
  currentImageUrl.value = ''
  zoomLevel.value = 1
}

const zoomIn = () => {
  if (zoomLevel.value < 3) zoomLevel.value += 0.25
}

const zoomOut = () => {
  if (zoomLevel.value > 0.5) zoomLevel.value -= 0.25
}

const resetZoom = () => {
  zoomLevel.value = 1
}

// --- GESTION DES PAIEMENTS ---
const isPaiementLoading = ref(false)
const isAjoutPaiementVisible = ref(false)

const paiementForm = ref({
  montant: 0,
  modePaiement: 'ESPECES',
  referenceTransaction: '',
})

const preparerNouveauPaiement = () => {
  paiementForm.value = {
    montant: selectedCommande.value?.resteAPayer || 0,
    modePaiement: 'ESPECES',
    referenceTransaction: '',
  }
  isAjoutPaiementVisible.value = true
}

const soumettrePaiement = async () => {
  if (!selectedCommande.value || !paiementForm.value.montant || paiementForm.value.montant <= 0) {
    alert('Veuillez saisir un montant valide.')
    return
  }

  if (paiementForm.value.montant > (selectedCommande.value.resteAPayer || 0)) {
    alert('Le montant saisi dépasse le reste à payer !')
    return
  }

  isPaiementLoading.value = true
  try {
    await paiementService.ajouterPaiement(selectedCommande.value.id, paiementForm.value)
    alert('Paiement enregistré avec succès !')
    isAjoutPaiementVisible.value = false
    isViewModalOpen.value = false
    chargerCommandes(currentPage.value)
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du paiement", error)
    alert("Impossible d'enregistrer le paiement.")
  } finally {
    isPaiementLoading.value = false
  }
}

// --- VARIABLES D'ÉTAT ---
const commandes = ref<Commande[]>([])
const clientsList = ref<ClientResponseDTO[]>([])
const isLoading = ref(false)
const currentPage = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)

const searchQuery = ref('')
const selectedStatut = ref('')

// --- GESTION DES MODAUX ---
const isModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isSubmitting = ref(false)

const isEditMode = ref(false)
const currentCommandeId = ref<number | null>(null)
const selectedCommande = ref<Commande | null>(null)
const statutInitial = ref<string>('')

const statutsDisponibles = computed(() => {
  if (!isEditMode.value) return ['CREEE']

  const actuel = statutInitial.value
  if (actuel === 'CREEE') return ['CREEE', 'EN_CONFECTION', 'ANNULEE']
  if (actuel === 'EN_CONFECTION') return ['EN_CONFECTION', 'ESSAYAGE']
  if (actuel === 'ESSAYAGE') return ['ESSAYAGE', 'TERMINEE']
  if (actuel === 'TERMINEE') return ['TERMINEE']
  if (actuel === 'ANNULEE') return ['ANNULEE']

  return [actuel]
})

// Modèle pour le formulaire UI
// On utilise `any` pour les lignes afin de gérer les fichiers locaux (qui ne sont pas dans le DTO)
const ligneParDefaut = () => ({
  nomMaquette: '',
  quantite: 1,
  prixConfection: 0,
  fichiers: [] as File[],
  previews: [] as string[],
  imagesUrl: [] as string[],
})

const commandeForm = ref({
  clientId: '' as number | '',
  dateLivraison: '',
  lignes: [ligneParDefaut()] as any[],
  statut: 'CREEE',
  resteAPayer: 0,
  coutTotal: 0,
})

// --- GESTION DYNAMIQUE DES LIGNES ET IMAGES ---
const ajouterLigne = () => {
  commandeForm.value.lignes.push(ligneParDefaut())
}

const supprimerLigne = (index: number) => {
  if (commandeForm.value.lignes.length > 1) {
    const ligne = commandeForm.value.lignes[index]
    if (ligne && ligne.previews) {
      ligne.previews.forEach((preview: string) => URL.revokeObjectURL(preview))
    }
    commandeForm.value.lignes.splice(index, 1)
  }
}

const gererSelectionImages = (event: Event, indexLigne: number) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return

  const nouveauxFichiers = Array.from(input.files)
  const ligne = commandeForm.value.lignes[indexLigne]

  if (ligne.fichiers.length + ligne.imagesUrl.length + nouveauxFichiers.length > 5) {
    alert('Vous ne pouvez pas associer plus de 5 images par article.')
    input.value = ''
    return
  }

  for (const fichier of nouveauxFichiers) {
    ligne.fichiers.push(fichier)
    ligne.previews.push(URL.createObjectURL(fichier))
  }

  input.value = ''
}

const supprimerImageLocale = (indexLigne: number, indexImage: number) => {
  const ligne = commandeForm.value.lignes[indexLigne]
  if (ligne && ligne.previews && ligne.previews[indexImage]) {
    URL.revokeObjectURL(ligne.previews[indexImage])
  }
  ligne.fichiers.splice(indexImage, 1)
  ligne.previews.splice(indexImage, 1)
}

const totalEstime = computed(() => {
  return commandeForm.value.lignes.reduce((total, ligne) => {
    return total + (ligne.quantite || 0) * (ligne.prixConfection || 0)
  }, 0)
})

// --- LOGIQUE API ---
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

const chargerClientsPourSelect = async () => {
  try {
    const response = await clientService.getAllClients(0, 100)
    clientsList.value = response.data.content
  } catch (error) {
    console.error('Erreur de chargement des clients', error)
  }
}

watch(selectedStatut, () => {
  chargerCommandes(0)
})

// --- ACTIONS SUR LES BOUTONS ---
const ouvrirModalCreation = () => {
  isEditMode.value = false
  currentCommandeId.value = null
  statutInitial.value = 'CREEE'

  commandeForm.value = {
    clientId: '',
    dateLivraison: '',
    lignes: [ligneParDefaut()],
    statut: 'CREEE',
    resteAPayer: 0,
    coutTotal: 0,
  }
  isModalOpen.value = true
}

const ouvrirModalEdition = (commande: Commande) => {
  isEditMode.value = true
  currentCommandeId.value = commande.id
  statutInitial.value = commande.statut

  const dateFormatee = commande.dateLivraison ? commande.dateLivraison.slice(0, 10) : ''

  const lignesExistantes =
    commande.lignes && Array.isArray(commande.lignes)
      ? JSON.parse(JSON.stringify(commande.lignes)).map((l: any) => ({
          ...l,
          fichiers: [] as File[],
          previews: [] as string[],
          imagesUrl: l.imagesUrl || (l.images ? l.images.map((img: any) => img.url) : []),
        }))
      : [ligneParDefaut()]

  commandeForm.value = {
    clientId: commande.client?.id || '',
    dateLivraison: dateFormatee,
    lignes: lignesExistantes,
    statut: commande.statut,
    coutTotal: commande.coutTotal || 0,
    resteAPayer:
      commande.resteAPayer !== undefined ? commande.resteAPayer : commande.coutTotal || 0,
  }
  isModalOpen.value = true
}

const ouvrirModalDetails = (commande: Commande) => {
  selectedCommande.value = commande
  isViewModalOpen.value = true
}

// --- SOUMISSION DU FORMULAIRE ---
const soumettreCommande = async () => {
  const ligneInvalide = commandeForm.value.lignes.find(
    (l) => l.fichiers.length === 0 && l.imagesUrl.length === 0,
  )
  if (ligneInvalide) {
    alert('Veuillez ajouter au moins une image pour chaque article.')
    return
  }

  isSubmitting.value = true
  try {
    for (const ligne of commandeForm.value.lignes) {
      if (ligne.fichiers.length > 0) {
        const responseUpload = await fileUploadService.uploadImages(ligne.fichiers)
        ligne.imagesUrl = [...ligne.imagesUrl, ...responseUpload.data]
        ligne.fichiers = []
        if (ligne.previews) {
          ligne.previews.forEach((url: string) => URL.revokeObjectURL(url))
        }
        ligne.previews = []
      }
    }

    // MAPPER POUR LE BACKEND
    // MAPPER POUR LE BACKEND
    const payload: CommandeRequest = {
      clientId: Number(commandeForm.value.clientId),
      dateLivraison: commandeForm.value.dateLivraison,
      // Forcer le type pour rassurer le compilateur :
      statut: commandeForm.value.statut as any,
      lignes: commandeForm.value.lignes.map((ligne: any) => ({
        nomMaquette: ligne.nomMaquette,
        quantite: Number(ligne.quantite), // <-- Ligne 705 potentielle : forcer le type Number
        prixConfection: Number(ligne.prixConfection),
        imageUrlMaquette: ligne.imagesUrl && ligne.imagesUrl.length > 0 ? ligne.imagesUrl[0] : '',
      })),
    }

    if (isEditMode.value && currentCommandeId.value) {
      await commandeService.updateCommande(currentCommandeId.value, payload)
    } else {
      await commandeService.creerCommande(payload)
    }

    isModalOpen.value = false
    chargerCommandes(currentPage.value)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde', error)
  } finally {
    isSubmitting.value = false
  }
}

// --- FILTRE LOCAL ---
const commandesAffichees = computed(() => {
  if (!searchQuery.value) return commandes.value
  const query = searchQuery.value.toLowerCase()
  return commandes.value.filter((commande) => commande.id.toString().includes(query))
})

// --- UTILITAIRES D'AFFICHAGE ---
const formatDate = (dateString: string | undefined) => {
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

const getImageUrl = (cheminRelatif: any) => {
  if (!cheminRelatif) return ''

  if (typeof cheminRelatif === 'object') {
    cheminRelatif = cheminRelatif.url || cheminRelatif.imageUrl || ''
  }

  if (typeof cheminRelatif === 'string' && cheminRelatif.startsWith('http')) {
    return cheminRelatif
  }

  const baseUrl = 'http://localhost:8088'
  const slash = cheminRelatif.startsWith('/') ? '' : '/'
  return `${baseUrl}${slash}${cheminRelatif}`
}

const getImagesLigne = (ligne: any): string[] => {
  if (!ligne) return []
  const urls = ligne.imagesUrl || ligne.imageUrlMaquette
  if (!urls) return []
  return Array.isArray(urls) ? urls : [urls]
}

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
              <th scope="col" class="px-6 py-4">Nom client</th>
              <th scope="col" class="px-6 py-4">Telephone</th>
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
              <td class="px-6 py-4 font-medium text-white">
                {{ commande.client?.nom }} {{ commande.client?.prenom }}
              </td>
              <td class="px-6 py-4 font-medium text-white">{{ commande.client?.telephone }}</td>
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
            :disabled="statutInitial === 'TERMINEE' || statutInitial === 'ANNULEE'"
            class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option v-if="statutsDisponibles.includes('CREEE')" value="CREEE">Créée</option>
            <option v-if="statutsDisponibles.includes('EN_CONFECTION')" value="EN_CONFECTION">
              Passer en confection
            </option>
            <option v-if="statutsDisponibles.includes('ESSAYAGE')" value="ESSAYAGE">
              Prêt pour essayage
            </option>
            <option
              v-if="statutsDisponibles.includes('TERMINEE')"
              value="TERMINEE"
              :disabled="commandeForm.resteAPayer > 0"
            >
              Marquer comme terminée
              {{ commandeForm.resteAPayer > 0 ? '(Paiement incomplet ⚠️)' : '' }}
            </option>
            <option v-if="statutsDisponibles.includes('ANNULEE')" value="ANNULEE">
              Annuler la commande
            </option>
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

              <!-- NOUVEAU : SECTION UPLOAD IMAGES -->
              <div class="col-span-12 mt-2 bg-slate-800/80 p-3 rounded border border-slate-700/50">
                <label class="block text-xs font-medium text-slate-400 mb-2"
                  >Images du modèle (1 minimum, 5 maximum) *</label
                >

                <div class="flex flex-wrap gap-3 items-start">
                  <!-- Affichage des images déjà sur le serveur (Mode Édition) -->
                  <div
                    v-for="(url, imgIdx) in ligne.imagesUrl"
                    :key="'srv-' + imgIdx"
                    class="relative group"
                  >
                    <!-- Remplacer localhost par la bonne base URL si besoin, ou utiliser l'URL complète renvoyée par le backend -->
                    <img
                      :src="url.startsWith('http') ? url : `http://localhost:8088${url}`"
                      class="w-16 h-16 object-cover rounded-lg border border-slate-600 shadow-sm"
                    />
                    <button
                      @click.prevent="ligne.imagesUrl.splice(imgIdx, 1)"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      title="Supprimer l'image"
                    >
                      ×
                    </button>
                  </div>

                  <!-- Miniatures des NOUVELLES images sélectionnées -->
                  <div
                    v-for="(preview, imgIdx) in ligne.previews"
                    :key="'loc-' + imgIdx"
                    class="relative group"
                  >
                    <img
                      :src="preview"
                      class="w-16 h-16 object-cover rounded-lg border border-blue-500/50 shadow-sm"
                    />
                    <button
                      @click.prevent="supprimerImageLocale(index, imgIdx)"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      title="Retirer la sélection"
                    >
                      ×
                    </button>
                  </div>

                  <!-- Bouton d'ajout (Caché si on a déjà 3 images au total) -->
                  <label
                    v-if="
                      ligne.fichiers.length + (ligne.imagesUrl ? ligne.imagesUrl.length : 0) < 5
                    "
                    class="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-700/50 transition-colors"
                  >
                    <span class="text-slate-400 text-xl">+</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg, image/png, image/webp"
                      class="hidden"
                      @change="gererSelectionImages($event, index)"
                    />
                  </label>
                </div>

                <!-- Message d'erreur si 0 image -->
                <p
                  v-if="
                    ligne.fichiers.length === 0 &&
                    (!ligne.imagesUrl || ligne.imagesUrl.length === 0)
                  "
                  class="text-red-400 text-xs mt-2 flex items-center gap-1"
                >
                  ⚠️ Au moins une image est requise.
                </p>
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
    <Modal :isOpen="isViewModalOpen" title="Dossier de commande" @close="isViewModalOpen = false">
      <div v-if="selectedCommande" class="space-y-6">
        <!-- En-tête de la commande -->
        <div class="flex items-center justify-between border-b border-slate-700 pb-4">
          <div>
            <h3 class="text-2xl font-bold text-white">Commande #{{ selectedCommande.id }}</h3>
            <p class="text-slate-400 text-sm">
              Enregistrée le
              {{ formatDate(selectedCommande.dateCommande) }}
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

        <!-- Infos Générales -->
        <div
          class="grid grid-cols-2 gap-y-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700"
        >
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase mb-1">Client</span>
            <span class="text-white font-medium block">
              {{
                selectedCommande.client
                  ? selectedCommande.client.nom + ' ' + selectedCommande.client.prenom
                  : 'Non fourni'
              }}
            </span>
            <span class="text-slate-400 text-sm">
              📞 {{ selectedCommande.client?.telephone || 'Aucun numéro' }}
            </span>
          </div>
          <div>
            <span class="block text-xs font-semibold text-slate-500 uppercase mb-1"
              >Livraison prévue</span
            >
            <span class="text-emerald-400 font-medium capitalize">{{
              formatDate(selectedCommande.dateLivraison)
            }}</span>
          </div>
        </div>

        <!-- 🚀 LISTE DES ARTICLES (LIGNES DE COMMANDE) -->
        <div>
          <h4
            class="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center justify-between"
          >
            <span>Articles de la commande</span>
            <span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">
              {{ selectedCommande.lignes?.length || 0 }} article(s)
            </span>
          </h4>

          <div class="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <table class="w-full text-left text-sm text-gray-300">
              <thead
                class="bg-slate-900/50 text-gray-400 text-xs font-semibold uppercase border-b border-slate-700"
              >
                <tr>
                  <th class="px-4 py-3">Modèle / Maquette</th>
                  <th class="px-4 py-3 text-center">Qté</th>
                  <th class="px-4 py-3 text-right">Prix Unitaire</th>
                  <th class="px-4 py-3 text-right">Sous-total</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-700/50">
                <tr v-if="!selectedCommande.lignes || selectedCommande.lignes.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500 italic">
                    Aucun article détaillé pour cette commande.
                  </td>
                </tr>
                <tr
                  v-for="(ligne, idx) in selectedCommande.lignes"
                  :key="idx"
                  class="hover:bg-slate-700/30 transition-colors"
                >
                  <!-- 1ère Cellule : Nom du modèle + Images -->
                  <td class="px-4 py-3">
                    <span class="font-medium text-white block">{{
                      ligne?.nomMaquette || 'Sans nom'
                    }}</span>

                    <!-- 🚀 ON UTILISE NOTRE NOUVELLE FONCTION ICI -->
                    <div v-if="getImagesLigne(ligne).length > 0" class="flex flex-wrap gap-2 mt-2">
                      <div
                        v-for="(url, imgIdx) in getImagesLigne(ligne)"
                        :key="imgIdx"
                        class="relative group cursor-zoom-in"
                      >
                        <!-- On utilise notre fonction openImageViewer -->
                        <img
                          :src="getImageUrl(url)"
                          alt="Maquette"
                          @click="openImageViewer(getImageUrl(url))"
                          class="w-12 h-12 object-cover rounded border border-slate-600 shadow-sm hover:scale-110 transition-transform duration-200 z-10 cursor-pointer"
                        />
                      </div>
                    </div>
                  </td>

                  <!-- 2ème Cellule : Quantité -->
                  <td class="px-4 py-3 text-center text-slate-300">{{ ligne?.quantite ?? 0 }}</td>

                  <!-- 3ème Cellule : Prix Unitaire -->
                  <td class="px-4 py-3 text-right text-slate-400">
                    {{ ligne?.prixConfection ?? 0 }} XAF
                  </td>

                  <!-- 4ème Cellule : Sous-total -->
                  <td class="px-4 py-3 text-right font-medium text-white">
                    {{ ligne?.sousTotal ?? (ligne?.quantite ?? 0) * (ligne?.prixConfection ?? 0) }}
                    XAF
                  </td>
                </tr>
              </tbody>
              <!-- Pied du tableau avec le Total -->
              <tfoot class="bg-slate-900/80 border-t border-slate-600">
                <tr>
                  <td
                    colspan="3"
                    class="px-4 py-3 text-right font-semibold text-slate-300 uppercase text-xs"
                  >
                    Total de la commande :
                  </td>
                  <td class="px-4 py-3 text-right text-lg font-bold text-emerald-400">
                    {{ selectedCommande.coutTotal ?? 0 }} XAF
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- 💰 SECTION FINANCIÈRE ET PAIEMENTS -->
      <div v-if="selectedCommande" class="mt-8 border-t border-slate-700 pt-6">
        <h4 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>💳 État Financier</span>
          <!-- Badge de statut de paiement -->
          <span
            v-if="selectedCommande.statutPaiement === 'PAYE_TOTALEMENT'"
            class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2 py-0.5 rounded-full font-medium"
            >Soldé</span
          >
          <span
            v-else-if="selectedCommande.statutPaiement === 'ACOMPTE'"
            class="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded-full font-medium"
            >Acompte versé</span
          >
          <span
            v-else
            class="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-0.5 rounded-full font-medium"
            >Impayé</span
          >
        </h4>

        <!-- Récapitulatif Chiffré -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
            <span class="block text-xs text-slate-400 mb-1">Total Commande</span>
            <span class="text-lg font-bold text-white"
              >{{ selectedCommande.coutTotal ?? 0 }} XAF</span
            >
          </div>
          <div class="bg-slate-800 p-3 rounded-lg border border-emerald-900/50 text-center">
            <span class="block text-xs text-slate-400 mb-1">Déjà Payé</span>
            <span class="text-lg font-bold text-emerald-400"
              >{{ selectedCommande.montantPaye ?? 0 }} XAF</span
            >
          </div>
          <div class="bg-slate-800 p-3 rounded-lg border border-amber-900/50 text-center">
            <span class="block text-xs text-slate-400 mb-1">Reste à payer</span>
            <span class="text-lg font-bold text-amber-400">
              {{ selectedCommande.resteAPayer ?? selectedCommande.coutTotal ?? 0 }} XAF
            </span>
          </div>
        </div>

        <!-- Historique des paiements (S'il y en a) -->
        <div
          v-if="selectedCommande.paiements && selectedCommande.paiements.length > 0"
          class="mb-6"
        >
          <h5 class="text-sm font-semibold text-slate-300 mb-2">Historique des transactions</h5>
          <ul class="space-y-2">
            <li
              v-for="paiement in selectedCommande.paiements"
              :key="paiement.id"
              class="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50 text-sm"
            >
              <div>
                <span class="text-emerald-400 font-medium">+ {{ paiement?.montant ?? 0 }} XAF</span>
                <span v-if="paiement?.modePaiement" class="text-slate-400 ml-2 text-xs">
                  ({{ paiement.modePaiement.replace('_', ' ') }})
                </span>
              </div>
              <div class="text-right">
                <span class="text-slate-300 block">{{ formatDate(paiement?.datePaiement) }}</span>
                <span
                  v-if="paiement?.referenceTransaction"
                  class="text-xs text-slate-500 font-mono"
                >
                  Ref: {{ paiement.referenceTransaction }}
                </span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Bouton / Formulaire pour ajouter un paiement -->
        <div
          v-if="
            (selectedCommande.resteAPayer ?? 0) > 0 ||
            (selectedCommande.resteAPayer === undefined && (selectedCommande.coutTotal ?? 0) > 0)
          "
        >
          <!-- Bouton initial -->
          <button
            v-if="!isAjoutPaiementVisible"
            @click="preparerNouveauPaiement"
            class="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <span>+</span> Enregistrer un paiement (Acompte ou Solde)
          </button>

          <!-- Le formulaire (caché par défaut) -->
          <form
            v-else
            @submit.prevent="soumettrePaiement"
            class="bg-slate-800 p-4 rounded-lg border border-emerald-500/30 space-y-4"
          >
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1"
                  >Montant à verser (XAF) *</label
                >
                <input
                  v-model="paiementForm.montant"
                  type="number"
                  required
                  min="1"
                  :max="selectedCommande.resteAPayer ?? selectedCommande.coutTotal"
                  class="w-full bg-slate-900 border border-slate-600 text-emerald-400 font-bold text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1"
                  >Mode de paiement *</label
                >
                <select
                  v-model="paiementForm.modePaiement"
                  required
                  class="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CARTE_BANCAIRE">Carte Bancaire</option>
                  <option value="VIREMENT">Virement</option>
                </select>
              </div>
            </div>

            <div v-if="paiementForm.modePaiement !== 'ESPECES'">
              <label class="block text-xs font-medium text-slate-400 mb-1"
                >Référence transaction (Optionnel)</label
              >
              <input
                v-model="paiementForm.referenceTransaction"
                type="text"
                placeholder="Ex: ID Airtel Money / Tigo Cash"
                class="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
              />
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="isAjoutPaiementVisible = false"
                class="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="isPaiementLoading"
                class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                {{ isPaiementLoading ? 'Enregistrement...' : 'Valider le paiement' }}
              </button>
            </div>
          </form>
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
  </div>

  <!-- 3. VISIONNEUSE D'IMAGES EN PLEIN ÉCRAN (LIGHTBOX) -->
  <div
    v-if="isImageViewerOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm"
  >
    <!-- Bouton Fermer (Croix en haut à droite) -->
    <button
      @click="closeImageViewer"
      class="absolute top-6 right-6 text-slate-300 hover:text-white bg-slate-800 hover:bg-red-500 rounded-full p-2 transition-colors z-50 shadow-lg"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        ></path>
      </svg>
    </button>

    <!-- Barre de contrôles de Zoom (En bas au centre) -->
    <div
      class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/90 px-6 py-3 rounded-full border border-slate-600 shadow-2xl z-50"
    >
      <!-- Zoom Arrière -->
      <button
        @click="zoomOut"
        class="text-white hover:text-blue-400 p-1 transition-colors"
        title="Zoom arrière"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
          ></path>
        </svg>
      </button>

      <!-- Niveau de zoom (%) -->
      <span class="text-slate-300 font-medium min-w-[3rem] text-center text-sm">
        {{ Math.round(zoomLevel * 100) }}%
      </span>

      <!-- Zoom Avant -->
      <button
        @click="zoomIn"
        class="text-white hover:text-blue-400 p-1 transition-colors"
        title="Zoom avant"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          ></path>
        </svg>
      </button>

      <div class="w-px h-6 bg-slate-600 mx-1"></div>

      <!-- Réinitialiser le zoom -->
      <button
        @click="resetZoom"
        class="text-white hover:text-blue-400 p-1 transition-colors"
        title="Taille originale"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          ></path>
        </svg>
      </button>
    </div>
    <!-- Utilisation de overflow-auto pour pouvoir scroller si l'image est très zoomée -->
    <div class="w-full h-full flex items-center justify-center overflow-auto p-4 custom-scrollbar">
      <img
        :src="currentImageUrl"
        alt="Maquette agrandie"
        class="max-w-full max-h-full object-contain transition-transform duration-300 ease-out shadow-2xl"
        :style="{ transform: `scale(${zoomLevel})` }"
      />
    </div>
  </div>
</template>

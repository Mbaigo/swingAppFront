<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { fileUploadService } from '@/services/fileUploadService' // Ajout de l'import pour l'upload d'images
import { commandeService } from '@/services/commandeService'
import { clientService } from '@/services/clientService'
import Modal from '@/components/Modal.vue'

// Assure-toi que ces types correspondent à ce qui est dans ton fichier commandeInterface.ts
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

// Modèle d'une ligne dans le formulaire
const ligneParDefaut = () => ({
  nomMaquette: '',
  quantite: 1,
  prixConfection: 0,
  fichiers: [] as File[], // Les vrais fichiers à uploader
  previews: [] as string[], // Les URL locales pour afficher les miniatures
  imagesUrl: [] as string[], // Les URL finales renvoyées par le backend
})

//--- GESTION DU STATUT DE COMMANDE----
const statutInitial = ref<string>('')

// Propriété qui calcule les statuts autorisés selon l'état de la commande
const statutsDisponibles = computed(() => {
  if (!isEditMode.value) return ['CREEE'] // En création, seul CREEE est possible

  const actuel = statutInitial.value

  // L'annulation n'est désormais proposée que si on est au stade CREEE
  if (actuel === 'CREEE') return ['CREEE', 'EN_CONFECTION', 'ANNULEE']

  // Pour les étapes suivantes, l'option d'annulation a disparu
  if (actuel === 'EN_CONFECTION') return ['EN_CONFECTION', 'ESSAYAGE']
  if (actuel === 'ESSAYAGE') return ['ESSAYAGE', 'TERMINEE']

  if (actuel === 'TERMINEE') return ['TERMINEE']
  if (actuel === 'ANNULEE') return ['ANNULEE']

  return [actuel]
})

// Modèle de données pour le formulaire (Création / Édition)
const commandeForm = ref({
  clientId: '' as number | '',
  dateLivraison: '',
  lignes: [ligneParDefaut()],
  statut: 'CREEE',
})

// --- GESTION DYNAMIQUE DES LIGNES ET IMAGES ---
const ajouterLigne = () => {
  commandeForm.value.lignes.push(ligneParDefaut())
}

const supprimerLigne = (index: number) => {
  if (commandeForm.value.lignes.length > 1) {
    // Libérer la mémoire des images de cette ligne avant de la supprimer
    commandeForm.value.lignes[index].previews.forEach((preview) => URL.revokeObjectURL(preview))
    commandeForm.value.lignes.splice(index, 1)
  }
}

const gererSelectionImages = (event: Event, indexLigne: number) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return

  const nouveauxFichiers = Array.from(input.files)
  const ligne = commandeForm.value.lignes[indexLigne]

  // Vérification : Pas plus de 5 images au total (fichiers locaux + images déjà sur le serveur)
  if (ligne.fichiers.length + ligne.imagesUrl.length + nouveauxFichiers.length > 5) {
    alert('Vous ne pouvez pas associer plus de 5 images par article.')
    input.value = '' // Réinitialise l'input
    return
  }

  // Ajout des fichiers et création des aperçus locaux (miniatures)
  for (const fichier of nouveauxFichiers) {
    ligne.fichiers.push(fichier)
    ligne.previews.push(URL.createObjectURL(fichier))
  }

  input.value = '' // Permet de re-sélectionner le même fichier si besoin
}

const supprimerImageLocale = (indexLigne: number, indexImage: number) => {
  const ligne = commandeForm.value.lignes[indexLigne]
  URL.revokeObjectURL(ligne.previews[indexImage]) // Libérer la mémoire
  ligne.fichiers.splice(indexImage, 1)
  ligne.previews.splice(indexImage, 1)
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

  commandeForm.value = {
    clientId: '',
    dateLivraison: '',
    lignes: [ligneParDefaut()],
    statut: 'CREEE',
  }
  isModalOpen.value = true
}

const ouvrirModalEdition = (commande: Commande) => {
  isEditMode.value = true
  currentCommandeId.value = commande.id
  statutInitial.value = commande.statut

  const dateFormatee = commande.dateLivraison ? commande.dateLivraison.slice(0, 10) : ''

  // Préparation des lignes existantes pour l'édition
  const lignesExistantes = (commande as any).lignes
    ? JSON.parse(JSON.stringify((commande as any).lignes)).map((l: any) => ({
        ...l,
        fichiers: [], // Fichiers physiques (vide au départ)
        previews: [], // Miniatures locales (vide au départ)
        // On récupère les URLs des images déjà existantes
        imagesUrl: l.imagesUrl || (l.images ? l.images.map((img: any) => img.url) : []),
      }))
    : [ligneParDefaut()]

  commandeForm.value = {
    clientId: commande.client ? commande.client.id : '',
    dateLivraison: dateFormatee,
    lignes: lignesExistantes,
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
  const soumettreCommande = async () => {
    // 1. VALIDATION FRONTEND : Vérifier que chaque ligne a au moins 1 image
    const ligneInvalide = commandeForm.value.lignes.find(
      (l) => l.fichiers.length === 0 && l.imagesUrl.length === 0,
    )
    if (ligneInvalide) {
      alert('Veuillez ajouter au moins une image pour chaque article.')
      return
    }

    isSubmitting.value = true
    try {
      // 2. UPLOAD DES IMAGES LIGNE PAR LIGNE
      for (const ligne of commandeForm.value.lignes) {
        if (ligne.fichiers.length > 0) {
          // 👈 APPEL AU NOUVEAU SERVICE ICI
          const responseUpload = await fileUploadService.uploadImages(ligne.fichiers)

          // On ajoute les nouvelles URLs reçues du backend aux URLs existantes
          ligne.imagesUrl = [...ligne.imagesUrl, ...responseUpload.data]

          // On vide les fichiers locaux et les miniatures pour libérer la mémoire
          ligne.fichiers = []
          ligne.previews.forEach((url) => URL.revokeObjectURL(url))
          ligne.previews = []
        }
      }

      // 3. ENVOI DE LA COMMANDE JSON GLOBALE
      if (isEditMode.value && currentCommandeId.value) {
        await commandeService.updateCommande(currentCommandeId.value, commandeForm.value)
      } else {
        await commandeService.creerCommande(commandeForm.value)
      }

      isModalOpen.value = false
      chargerCommandes(currentPage.value)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde', error)
    } finally {
      isSubmitting.value = false
    }
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

// Fonction pour générer l'URL complète de l'image
const getImageUrl = (cheminRelatif: string) => {
  if (!cheminRelatif) return ''
  // Si c'est déjà une URL complète (ex: hébergée sur S3 ou un CDN externe), on la retourne telle quelle
  if (cheminRelatif.startsWith('http')) return cheminRelatif

  // Sinon, on concatène l'URL de base du backend
  // Remplace par la variable d'environnement de ton API en production
  const baseUrl = 'http://localhost:8088'
  return `${baseUrl}${cheminRelatif}`
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
            <option v-if="statutsDisponibles.includes('TERMINEE')" value="TERMINEE">
              Marquer comme terminée
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
                  <div
                    v-if="ligne.imagesUrl && ligne.imagesUrl.length > 0"
                    class="flex flex-wrap gap-2 mt-2"
                  >
                    <div
                      v-for="(url, imgIdx) in ligne.imagesUrl"
                      :key="imgIdx"
                      class="relative group cursor-zoom-in"
                    >
                      <!-- On utilise notre fonction getImageUrl -->
                      <img
                        :src="getImageUrl(url)"
                        alt="Maquette"
                        class="w-12 h-12 object-cover rounded border border-slate-600 shadow-sm hover:scale-150 transition-transform duration-200 z-10"
                      />
                    </div>
                  </div>
                  <td class="px-4 py-3 text-center text-slate-300">{{ ligne.quantite }}</td>
                  <td class="px-4 py-3 text-right text-slate-400">
                    {{ ligne.prixConfection }} XAF
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-white">
                    {{ ligne.sousTotal || ligne.quantite * ligne.prixConfection }} XAF
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
                    {{ selectedCommande.coutTotal }} XAF
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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
</template>

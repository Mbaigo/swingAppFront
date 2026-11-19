import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { commandeService } from '@/services/commandeService'
import { clientService } from '@/services/clientService'
import { paiementService } from '@/services/paiementService'
import { fileUploadService } from '@/services/fileUploadService'
import { recupererFacturePdf, type ModeOuverturePdf } from '@/services/factureService'
import type { Commande, CommandeRequest } from '@/types/commandeInterface'
import type { ClientResponseDTO } from '@/types/clientInterface'

export interface PaiementPayload {
  montant: number
  modePaiement: string
  referenceTransaction: string
}

export const useCommandeStore = defineStore('commande', () => {
  // --- ÉTAT MÉTIER ---
  const commandes = ref<Commande[]>([])
  const clientsList = ref<ClientResponseDTO[]>([])
  const selectedCommande = ref<Commande | null>(null)

  // --- PAGINATION & FILTRES ---
  const currentPage = ref(0)
  const totalPages = ref(0)
  const totalElements = ref(0)
  const searchQuery = ref('')
  const selectedStatut = ref('')

  // --- ÉTATS DE CHARGEMENT ---
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isPaiementLoading = ref(false)
  const loadingFactureId = ref<number | null>(null)

  // --- GETTERS ---
  const commandesAffichees = computed(() => {
    if (!searchQuery.value) return commandes.value
    const query = searchQuery.value.toLowerCase()
    return commandes.value.filter(
      (commande) =>
        commande.id.toString().includes(query) ||
        (commande.numeroFacture?.toLowerCase().includes(query) ?? false),
    )
  })

  // --- HELPER DE SYNCHRONISATION ---
  const resynchroniserSelection = () => {
    if (!selectedCommande.value) return
    const updated = commandes.value.find((c) => c.id === selectedCommande.value?.id)
    if (updated) {
      selectedCommande.value = updated
    }
  }

  // --- ACTIONS API ---
  const chargerCommandes = async (page: number = currentPage.value) => {
    isLoading.value = true
    try {
      const response = await commandeService.getCommandesFiltrees(page, 10, selectedStatut.value)
      commandes.value = response.data.content
      totalPages.value = response.data.totalPages
      totalElements.value = response.data.totalElements
      currentPage.value = response.data.number
      resynchroniserSelection()
    } catch (error) {
      console.error('Erreur de chargement des commandes', error)
      throw error
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
      throw error
    }
  }

  const uploaderImages = async (fichiers: File[]): Promise<string[]> => {
    const response = await fileUploadService.uploadImages(fichiers)
    return response.data
  }

  const sauvegarderCommande = async (payload: CommandeRequest, commandeId: number | null) => {
    isSubmitting.value = true
    try {
      if (commandeId !== null) {
        await commandeService.updateCommande(commandeId, payload)
      } else {
        await commandeService.creerCommande(payload)
      }
      await chargerCommandes(currentPage.value)
    } finally {
      isSubmitting.value = false
    }
  }

  const ajouterPaiement = async (commandeId: number, payload: PaiementPayload) => {
    isPaiementLoading.value = true
    try {
      await paiementService.ajouterPaiement(commandeId, payload)
      await chargerCommandes(currentPage.value)
    } finally {
      isPaiementLoading.value = false
    }
  }

  const ouvrirFacture = async (
    commandeId: number,
    aDejaNumeroFacture: boolean,
    mode: ModeOuverturePdf = 'download',
  ) => {
    if (loadingFactureId.value !== null) return

    loadingFactureId.value = commandeId
    try {
      await recupererFacturePdf(commandeId, mode)

      // Si c'est la première génération, on recharge pour récupérer le FAC-YYYY-XXXX
      if (!aDejaNumeroFacture) {
        await chargerCommandes(currentPage.value)
      }
    } finally {
      loadingFactureId.value = null
    }
  }

  const selectionnerCommande = (commande: Commande | null) => {
    selectedCommande.value = commande
  }

  return {
    // State
    commandes,
    clientsList,
    selectedCommande,
    currentPage,
    totalPages,
    totalElements,
    searchQuery,
    selectedStatut,
    isLoading,
    isSubmitting,
    isPaiementLoading,
    loadingFactureId,
    // Getters
    commandesAffichees,
    // Actions
    chargerCommandes,
    chargerClientsPourSelect,
    uploaderImages,
    sauvegarderCommande,
    ajouterPaiement,
    ouvrirFacture,
    selectionnerCommande,
  }
})

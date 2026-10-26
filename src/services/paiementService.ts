import { api } from './api'

export interface PaiementRequest {
  montant: number
  modePaiement: string
  referenceTransaction?: string
}

export const paiementService = {
  /**
   * Enregistre un nouveau paiement pour une commande spécifique
   */
  ajouterPaiement(commandeId: number, paiement: PaiementRequest) {
    return api.post(`/commandes/${commandeId}/paiements`, paiement)
  },
}

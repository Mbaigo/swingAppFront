// 1. Définir les valeurs exactes (Optionnel mais recommandé pour la sécurité)
export type StatutCommande = 'CREEE' | 'EN_CONFECTION' | 'ESSAYAGE' | 'TERMINEE' | 'ANNULEE'

// Ce qu'on ENVOIE au backend pour créer/modifier (Il n'y a ni id, ni dateCreation)
export interface CommandeRequest {
  clientId: number | ''
  dateLivraison: string // Format attendu: YYYY-MM-DD
  lignes: LigneCommandeRequest[]
  statut: StatutCommande
}

// Ce qu'on REÇOIT du backend (Il y a l'id, la date et le nom du client)
export interface Commande {
  id: number
  dateCommande: string
  dateLivraison: string // 👈 Remplacé (au lieu de dateLivraisonPrevue)
  statut: StatutCommande
  coutTotal: number
  // 👈 On s'attend maintenant à recevoir un objet client imbriqué
  client?: {
    id: number
    nom: string
    prenom: string
    telephone: string
  }

  lignes?: LigneCommandeResponse[]
}

export interface LigneCommandeRequest {
  nomMaquette: string
  imageUrlMaquette: string[]
  quantite: number
  prixConfection: number
  sousTotal?: number
}

export interface CommandeResponse {
  content: Commande[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface LigneCommandeResponse {
  id?: number
  nomMaquette: string
  quantite: number
  prixConfection: number
  sousTotal?: number
  imagesUrl?: string[] // Si tu renvoies les images
}

// 🚀 NOUVEAU : Interface pour représenter une transaction financière
export interface Paiement {
  id: number
  montant: number
  datePaiement: string
  modePaiement: 'ESPECES' | 'MOBILE_MONEY' | 'CARTE_BANCAIRE' | 'VIREMENT' | string
  referenceTransaction?: string
}

export interface Commande {
  id: number
  dateCommande: string
  dateLivraison: string
  statut: string
  coutTotal: number
  client?: {
    id: number
    nom: string
    prenom: string
    telephone: string
  }
  lignes?: LigneCommandeResponse[] // 👈 L'ajout crucial pour la vue détails
  // 💰 NOUVEAUX CHAMPS : Gestion Financière
  statutPaiement?: 'NON_PAYE' | 'ACOMPTE' | 'PAYE_TOTALEMENT' | string
  montantPaye?: number
  resteAPayer?: number
  paiements?: Paiement[] // Historique des paiements de cette commande
}

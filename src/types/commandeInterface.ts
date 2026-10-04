// Ce qu'on ENVOIE au backend pour créer/modifier (Il n'y a ni id, ni dateCreation)
export interface CommandeRequest {
  clientId: number | ''
  dateLivraison: string // Format attendu: YYYY-MM-DD
  lignes: LigneCommandeRequest[]
}

// Ce qu'on REÇOIT du backend (Il y a l'id, la date et le nom du client)
export interface Commande {
  id: number
  dateCommande: string
  dateLivraison: string // 👈 Remplacé (au lieu de dateLivraisonPrevue)
  statut: string
  coutTotal: number
  // 👈 On s'attend maintenant à recevoir un objet client imbriqué
  client?: {
    id: number
    nom: string
    prenom: string
    telephone: string
  }
}

export interface LigneCommandeRequest {
  nomMaquette: string
  imagesUrl: string[]
  quantite: number
  prixConfection: number
}

export interface CommandeResponse {
  content: Commande[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

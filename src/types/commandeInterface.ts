// Ce qu'on ENVOIE au backend pour créer/modifier (Il n'y a ni id, ni dateCreation)
export interface CommandeRequest {
  dateLivraisonPrevue: string
  statut: string
  coutTotal: number
  clientId: number | '' // L'ID du client est requis pour le backend
}

// Ce qu'on REÇOIT du backend (Il y a l'id, la date et le nom du client)
export interface Commande {
  id: number
  dateCreation: string
  dateLivraisonPrevue: string
  statut: string
  coutTotal: number
  nomClient?: string
}

export interface CommandeResponse {
  content: Commande[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

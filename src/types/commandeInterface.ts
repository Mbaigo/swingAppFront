// Types pour TypeScript (Ajuste selon ton DTO réel)
export interface Commande {
  id: number
  dateCreation: string
  dateLivraisonPrevue: string
  statut: string
  coutTotal: number
  nomClient?: string // Si tu as inclus le nom du client dans ton DTO
}
export interface CommandeResponse {
  content: Commande[]
  totalElements: number
  totalPages: number
  size: number
  number: number // Page actuelle (commence à 0)
}

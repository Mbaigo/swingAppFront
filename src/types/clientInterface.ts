// Définition du type Genre (à adapter selon les valeurs de ton Enum Java)
export type Genre = 'HOMME' | 'FEMME' | 'ADO' | 'ENFANT' // Ajoute d'autres genres si nécessaire

// Interface pour la création ou mise à jour (Request)
export interface ClientRequestDTO {
  nom: string
  prenom: string
  telephone: string
  email?: string // Optionnel car pas de @NotBlank dans le Java
  genre?: Genre // Optionnel ou obligatoire selon ta logique métier
  notesMorphologie?: string
}

// Interface pour la lecture (Response)
export interface ClientResponseDTO {
  id: number // Long en Java devient number
  nom: string
  prenom: string
  telephone: string
  email?: string
  genre: Genre
  notesMorphologie?: string
  dateCreation: string // LocalDateTime est sérialisé en String (ISO 8601) par Spring Boot
}

// Interface générique pour la pagination Spring Boot
export interface Page<T> {
  content: T[]
  totalPages: number
  totalElements: number
  size: number
  number: number
  empty: boolean
}

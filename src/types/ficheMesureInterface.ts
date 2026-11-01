// src/types/ficheMesureInterface.ts

// Équivalent du Map<String, Integer> de ton Backend
// Permet d'avoir des clés libres (ex: { "cou": 42, "epaules": 45 })
export interface MensurationsMap {
  [key: string]: number
}

// Équivalent de FicheMesureResponseDTO
export interface FicheMesureResponse {
  id: number
  clientId: number
  clientNom: string
  clientPrenom: string
  nomProjet: string
  datePrise: string // Date ISO retournée par Java
  mesures: MensurationsMap
  remarquesSpecifiques?: string
}

// Équivalent de FicheMesureRequestDTO
export interface FicheMesureRequest {
  clientId: number
  nomProjet: string
  mesures: MensurationsMap
  remarquesSpecifiques?: string
}

// Structure paginée de Spring Boot (pour le getAllFiches)
export interface PageFicheMesure {
  content: FicheMesureResponse[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

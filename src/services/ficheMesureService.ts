// src/services/ficheMesureService.ts
import { api } from './api'
import type {
  FicheMesureRequest,
  FicheMesureResponse,
  PageFicheMesure,
} from '@/types/ficheMesureInterface'

// Le chemin de base correspondant à ton @RequestMapping dans Spring
const BASE_URL = '/fiches-mesures'

export const ficheMesureService = {
  // 1. Créer une fiche (POST /api/v1/fiches-mesures)
  createFicheMesure(data: FicheMesureRequest) {
    return api.post<FicheMesureResponse>(BASE_URL, data)
  },

  // 2. Récupérer une fiche précise (GET /api/v1/fiches-mesures/{id})
  getFicheById(id: number) {
    return api.get<FicheMesureResponse>(`${BASE_URL}/${id}`)
  },

  // 3. Consulter l'historique d'un client (GET /api/v1/fiches-mesures/client/{clientId})
  getFichesByClientId(clientId: number) {
    return api.get<FicheMesureResponse[]>(`${BASE_URL}/client/${clientId}`)
  },

  // 4. Mettre à jour une fiche (PUT /api/v1/fiches-mesures/{id})
  updateFicheMesure(id: number, data: FicheMesureRequest) {
    return api.put<FicheMesureResponse>(`${BASE_URL}/${id}`, data)
  },

  // 5. Récupérer TOUTES les fiches (GET /api/v1/fiches-mesures)
  getAllFiches(page: number = 0, size: number = 10) {
    return api.get<PageFicheMesure>(BASE_URL, {
      params: { page, size },
    })
  },
}

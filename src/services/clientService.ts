import { api } from './api'
import type { ClientRequestDTO, ClientResponseDTO, Page } from '@/types/clientInterface'

export const clientService = {
  /**
   * Récupère tous les clients avec pagination
   */
  getAllClients(page: number = 0, size: number = 10) {
    console.log(api.get<Page<ClientResponseDTO>>(`/clients?page=${page}&size=${size}`))
    return api.get<Page<ClientResponseDTO>>(`/clients?page=${page}&size=${size}`)
  },

  /**
   * Récupère un client par son ID
   */
  getClientById(id: number) {
    return api.get<ClientResponseDTO>(`/clients/${id}`)
  },

  /**
   * Recherche un client par son numéro de téléphone
   */
  searchByTelephone(telephone: string) {
    // ⚠️ On utilise encodeURIComponent pour que le "+" du numéro (+237...)
    // ne soit pas transformé en espace par le navigateur lors de la requête.
    return api.get<ClientResponseDTO>(`/clients/search?telephone=${encodeURIComponent(telephone)}`)
  },

  /**
   * Crée un nouveau client
   */
  createClient(clientData: ClientRequestDTO) {
    return api.post<ClientResponseDTO>('/clients', clientData)
  },

  /**
   * Met à jour les informations d'un client existant
   */
  updateClient(id: number, clientData: ClientRequestDTO) {
    return api.put<ClientResponseDTO>(`/clients/${id}`, clientData)
  },
}

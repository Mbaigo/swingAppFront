import { api } from './api'

export const commandeService = {
  // Le paramètre page commence à 0 (standard Spring Boot)
  // size est le nombre d'éléments par page
  getAllCommandes(page = 0, size = 10) {
    return api.get(`/commandes?page=${page}&size=${size}`)
  },
}

import type { Commande } from '@/types/commandeInterface'
import { api } from './api'

export const commandeService = {
  // On ajoute "statut" en paramètre optionnel
  getCommandesFiltrees(page = 0, size = 10, statut = '') {
    if (statut) {
      // Appel vers l'endpoint filtré
      return api.get(`/commandes/statut/${statut}?page=${page}&size=${size}`)
    }
    // Appel global
    return api.get(`/commandes?page=${page}&size=${size}`)
  },

  // 👈 Nouvelle méthode pour créer une commande
  creerCommande(donnees: Commande) {
    return api.post('/commandes', donnees)
  },
}

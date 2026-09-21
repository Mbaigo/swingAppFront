import { api } from './api'
// Optionnel : Tu peux importer tes interfaces si besoin pour un typage plus strict
import type { CommandeRequest } from '@/types/commandeInterface'

export const commandeService = {
  // ==========================================
  // CRUD DE BASE
  // ==========================================

  creerCommande(donnees: CommandeRequest) {
    return api.post('/commandes', donnees)
  },

  getCommandeById(id: number) {
    return api.get(`/commandes/${id}`)
  },

  // ⚠️ Nécessite un @PutMapping("/{id}") dans Spring Boot pour la modification complète
  updateCommande(id: number, donnees: CommandeRequest) {
    return api.put(`/commandes/${id}`, donnees)
  },

  mettreAJourStatut(id: number, statut: string) {
    // Le statut est passé en RequestParam (ex: ?statut=EN_CONFECTION)
    return api.patch(`/commandes/${id}/statut?statut=${statut}`)
  },

  supprimerCommande(id: number) {
    return api.delete(`/commandes/${id}`)
  },

  // ==========================================
  // FILTRES ET LISTES (Avec Pagination)
  // ==========================================

  getCommandesFiltrees(page = 0, size = 10, statut = '') {
    if (statut) {
      return api.get(`/commandes/statut/${statut}?page=${page}&size=${size}`)
    }
    return api.get(`/commandes?page=${page}&size=${size}`)
  },

  getCommandesParJour(date: string, page = 0, size = 10) {
    // 'date' doit être au format YYYY-MM-DD
    return api.get(`/commandes/recherche/jour?date=${date}&page=${page}&size=${size}`)
  },

  getCommandesParSemaine(date: string, page = 0, size = 10) {
    return api.get(`/commandes/recherche/semaine?date=${date}&page=${page}&size=${size}`)
  },

  // ==========================================
  // GESTION DES LIVRAISONS (TABLEAU DE BORD)
  // ==========================================

  getCommandesALivrerAujourdhui(page = 0, size = 10) {
    return api.get(`/commandes/livraisons/aujourdhui?page=${page}&size=${size}`)
  },

  getCommandesALivrerCetteSemaine(page = 0, size = 10) {
    return api.get(`/commandes/livraisons/semaine?page=${page}&size=${size}`)
  },

  // ==========================================
  // NOUVEAUX ENDPOINTS (DASHBOARD)
  // ==========================================

  getCommandesParMois(annee: number, mois: number, page = 0, size = 10) {
    return api.get(`/commandes/mois?annee=${annee}&mois=${mois}&page=${page}&size=${size}`)
  },

  getCommandesParPeriode(dateDebut: string, dateFin: string, page = 0, size = 10) {
    // Les dates doivent être au format ISO (ex: 2026-09-21T00:00:00)
    return api.get(
      `/commandes/periode?dateDebut=${dateDebut}&dateFin=${dateFin}&page=${page}&size=${size}`,
    )
  },
}

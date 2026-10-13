import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    livraisonsDuJour: 0,
    commandesEnCours: 0,
    chiffreSemaine: 0, // On garde ce nom pour la variable, même si c'est le chiffre de la période
    repartitionStatut: [0, 0, 0, 0],
    commandesMoisActuel: [] as any[],
    commandesMoisPrecedent: [] as any[],
    isLoading: false,
  }),

  actions: {
    // 👈 Ajout des paramètres optionnels
    async fetchDashboardData(dateDebut?: string, dateFin?: string) {
      this.isLoading = true
      try {
        // Construction de l'URL avec les filtres si l'utilisateur en a choisi
        let url = '/dashboard'
        if (dateDebut && dateFin) {
          url += `?dateDebut=${dateDebut}&dateFin=${dateFin}`
        }

        const response = await api.get(url)
        const data = response.data

        this.livraisonsDuJour = data.livraisonsDuJour || 0
        this.commandesEnCours = data.commandesEnCours || 0
        this.chiffreSemaine = data.chiffreSemaine || 0

        const rep = data.repartitionStatut || {}
        this.repartitionStatut = [
          rep['CREEE'] || 0,
          rep['EN_CONFECTION'] || 0,
          rep['ESSAYAGE'] || 0,
          rep['TERMINEE'] || 0,
        ]

        this.commandesMoisActuel = data.commandesMoisActuel || []
        this.commandesMoisPrecedent = data.commandesMoisPrecedent || []
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        this.isLoading = false
      }
    },
  },
})

import { defineStore } from 'pinia'
import { api } from '@/services/api'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    livraisonsDuJour: 0,
    commandesEnCours: 0,
    chiffreSemaine: 0,
    repartitionStatut: [0, 0, 0, 0], // [Attente, En Cours, Prêtes, Livrées]

    // Données brutes pour les graphiques
    commandesMoisActuel: [] as any[],
    commandesMoisPrecedent: [] as any[],

    isLoading: false,
  }),

  actions: {
    async fetchDashboardData() {
      this.isLoading = true
      try {
        // 1. Calcul des dates (Mois actuel et précédent)
        const now = new Date()
        const anneeActuelle = now.getFullYear()
        const moisActuel = now.getMonth() + 1 // JS commence les mois à 0

        const moisPrecedent = moisActuel === 1 ? 12 : moisActuel - 1
        const anneePrecedente = moisActuel === 1 ? anneeActuelle - 1 : anneeActuelle

        // 2. Lancement de TOUTES les requêtes en parallèle (très performant)
        // 2. Lancement de TOUTES les requêtes avec les vrais statuts
        const [
          reqCreee,
          reqEnConfection,
          reqEssayage,
          reqTerminee,
          reqMoisActuel,
          reqMoisPrecedent,
          reqLivraisons,
        ] = await Promise.all([
          api.get('/commandes/statut/CREEE'),
          api.get('/commandes/statut/EN_CONFECTION'),
          api.get('/commandes/statut/ESSAYAGE'),
          api.get('/commandes/statut/TERMINEE'),
          api.get(`/commandes/mois?annee=${anneeActuelle}&mois=${moisActuel}`),
          api.get(`/commandes/mois?annee=${anneePrecedente}&mois=${moisPrecedent}`),
          api.get('/commandes/livraisons/aujourdhui'),
        ])

        // 3. Extraction des données
        const nbCreee = reqCreee.data.totalElements || 0
        const nbEnConfection = reqEnConfection.data.totalElements || 0
        const nbEssayage = reqEssayage.data.totalElements || 0
        const nbTerminee = reqTerminee.data.totalElements || 0
        // Mise à jour de la carte "À livrer aujourd'hui"
        this.livraisonsDuJour = reqLivraisons.data.totalElements || 0
        console.log('Livraisons du jour:', this.livraisonsDuJour)

        // Logique métier : "En cours" = Confection + Essayage
        this.commandesEnCours = nbEnConfection + nbEssayage

        // On met à jour le tableau pour le graphique Disque
        this.repartitionStatut = [nbCreee, nbEnConfection, nbEssayage, nbTerminee]

        // 4. Extraction des données pour les graphiques
        this.commandesMoisActuel = reqMoisActuel.data.content || []
        this.commandesMoisPrecedent = reqMoisPrecedent.data.content || []

        // 5. Calcul du chiffre d'affaires (Somme des coutTotal du mois)
        this.chiffreSemaine = this.commandesMoisActuel.reduce(
          (somme, cmd) => somme + (cmd.coutTotal || 0),
          0,
        )

        // Note: Pour les livraisons du jour, on simule à 0 pour l'instant
        // jusqu'à ce que tu exposes le endpoint /livraisons/aujourdhui dans le Controller
        this.livraisonsDuJour = 0
      } catch (error) {
        console.error('Erreur lors du chargement des données du dashboard:', error)
      } finally {
        this.isLoading = false
      }
    },
  },
})

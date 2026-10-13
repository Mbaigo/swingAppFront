<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
)

// Initialisation du store
const dashboardStore = useDashboardStore()

const filtreType = ref('SEMAINE')
const dateDebut = ref('')
const dateFin = ref('')

// Logique de filtrage
const appliquerFiltre = () => {
  if (filtreType.value === 'PERSONNALISE' && dateDebut.value && dateFin.value) {
    dashboardStore.fetchDashboardData(dateDebut.value, dateFin.value)
  } else {
    dashboardStore.fetchDashboardData() // Comportement par défaut du backend
  }
}

// Si on repasse sur "Semaine", on recharge immédiatement
watch(filtreType, (newVal) => {
  if (newVal === 'SEMAINE') {
    dashboardStore.fetchDashboardData()
  }
})

// Chargement des données au montage du composant
onMounted(() => {
  dashboardStore.fetchDashboardData()
})

// --------------------------------------------------
// 1. DISQUE : Commandes de la semaine (DYNAMIQUE)
// --------------------------------------------------
// --- AVANT ---
/*
const doughnutData = computed(() => ({
  labels: ['Créées', 'En confection', 'Essayages', 'Terminées'],
  datasets: [ ... ]
}))
*/

// --- APRÈS (La version intelligente) ---
const doughnutData = computed(() => {
  const donnees = dashboardStore.repartitionStatut
  // On calcule la somme de toutes les commandes
  const totalCommandes = donnees.reduce((a, b) => a + b, 0)

  // Si le total est 0, on affiche un disque gris (vide)
  if (totalCommandes === 0) {
    return {
      labels: ['Aucune commande cette semaine'],
      datasets: [
        {
          data: [1], // On met 1 pour forcer Chart.js à dessiner un cercle complet
          backgroundColor: ['#334155'], // Couleur gris foncé (slate-700)
          borderWidth: 0,
        },
      ],
    }
  }

  // Sinon, on affiche les vraies données
  return {
    labels: ['Créées', 'En confection', 'Essayages', 'Terminées'],
    datasets: [
      {
        data: donnees,
        backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }
})
const doughnutOptions = ref({ responsive: true, maintainAspectRatio: false })

// --------------------------------------------------
// 2. COURBE SIMPLE : (Statique pour le moment)
// --------------------------------------------------
const lineTraiteesData = ref({
  labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
  datasets: [
    {
      label: 'Volume traité (Juillet - Août)',
      data: [12, 15, 10, 18, 22, 25, 20, 30],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
})

// --------------------------------------------------
// 3. COURBE COMPARATIVE (DYNAMIQUE) : Mois N vs N-1
// --------------------------------------------------
const lineComparaisonData = computed(() => {
  // Fonction utilitaire pour regrouper les commandes par "Semaine" (1 à 4)
  const grouperParSemaine = (commandes: any[]) => {
    const semaines = [0, 0, 0, 0] // 4 semaines
    commandes.forEach((cmd) => {
      // Attention à utiliser le bon nom de champ (dateCommande ou dateCreation selon ton DTO)
      const dateStr = cmd.dateCommande || cmd.dateCreation
      if (!dateStr) return

      const jour = new Date(dateStr).getDate()

      if (jour <= 7) semaines[0]++
      else if (jour <= 14) semaines[1]++
      else if (jour <= 21) semaines[2]++
      else semaines[3]++
    })
    return semaines
  }

  const dataMoisActuel = grouperParSemaine(dashboardStore.commandesMoisActuel)
  const dataMoisPrecedent = grouperParSemaine(dashboardStore.commandesMoisPrecedent)

  return {
    labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'],
    datasets: [
      {
        label: 'Mois Précédent',
        data: dataMoisPrecedent,
        borderColor: '#94a3b8',
        borderDash: [5, 5],
        tension: 0.4,
      },
      {
        label: 'Mois Actuel',
        data: dataMoisActuel,
        borderColor: '#3b82f6',
        tension: 0.4,
      },
    ],
  }
})

const lineOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
})

// Utilitaire de formatage monétaire
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('fr-FR').format(amount)
}
</script>

<template>
  <div class="space-y-6 pb-8">
    <!-- En-tête de page -->
    <!-- En-tête de page & Filtres -->
    <div
      class="flex flex-col md:flex-row justify-between md:items-end gap-4 bg-slate-800 p-5 rounded-xl border border-slate-700"
    >
      <div>
        <h1 class="text-2xl font-bold text-gray-300">Vue d'ensemble</h1>
        <p class="text-gray-400 text-sm mt-1">Statistiques de votre atelier de confection</p>
      </div>

      <!-- Barre de filtrage -->
      <div class="flex flex-col sm:flex-row gap-3 items-center">
        <select
          v-model="filtreType"
          class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 w-full sm:w-auto"
        >
          <option value="SEMAINE">Cette semaine</option>
          <option value="PERSONNALISE">Période personnalisée</option>
        </select>

        <div v-if="filtreType === 'PERSONNALISE'" class="flex items-center gap-2">
          <input
            v-model="dateDebut"
            type="date"
            class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-2 py-2 outline-none focus:border-blue-500"
          />
          <span class="text-slate-400 text-sm">à</span>
          <input
            v-model="dateFin"
            type="date"
            class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-2 py-2 outline-none focus:border-blue-500"
          />
          <button
            @click="appliquerFiltre"
            :disabled="!dateDebut || !dateFin || dashboardStore.isLoading"
            class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Filtrer
          </button>
        </div>
      </div>
    </div>

    <!-- 1ère Section : Cartes statistiques rapides -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Carte : À livrer aujourd'hui -->
      <div class="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
        <h3 class="text-gray-300 text-sm font-medium">À livrer aujourd'hui</h3>
        <!-- Effet de chargement (Squelette) -->
        <div
          v-if="dashboardStore.isLoading"
          class="animate-pulse h-9 bg-slate-700 rounded mt-2 w-16"
        ></div>
        <p v-else class="text-3xl font-bold text-gray-200 mt-2">
          {{ dashboardStore.livraisonsDuJour }}
        </p>
      </div>

      <!-- Carte : Commandes en cours -->
      <div class="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
        <h3 class="text-gray-300 text-sm font-medium">Commandes actives</h3>
        <div
          v-if="dashboardStore.isLoading"
          class="animate-pulse h-9 bg-slate-700 rounded mt-2 w-16"
        ></div>
        <p v-else class="text-3xl font-bold text-blue-500 mt-2">
          {{ dashboardStore.commandesEnCours }}
        </p>
      </div>

      <!-- Carte : Chiffre de la semaine -->
      <div class="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
        <h3 class="text-gray-300 text-sm font-medium">
          {{ filtreType === 'SEMAINE' ? 'Chiffre de la semaine' : 'Chiffre de la période' }}
        </h3>
        <div
          v-if="dashboardStore.isLoading"
          class="animate-pulse h-9 bg-slate-700 rounded mt-2 w-32"
        ></div>
        <p v-else class="text-3xl font-bold text-emerald-500 mt-2">
          <!-- Formatage avec des espaces (ex: 150 000 XAF) -->
          {{ formatMoney(dashboardStore.chiffreSemaine) }} XAF
        </p>
      </div>
    </div>

    <!-- 2ème Section : Analyse de la semaine et traitement -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Graphique Disque (1/3 de l'espace) -->
      <div class="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 lg:col-span-1">
        <h3 class="text-gray-300 font-semibold mb-4">Répartition de la semaine</h3>

        <!-- Affichage du loader ou du graphique -->
        <div v-if="dashboardStore.isLoading" class="h-64 flex items-center justify-center">
          <span class="text-slate-500 animate-pulse">Chargement des données...</span>
        </div>
        <div v-else class="h-64 relative">
          <Doughnut :data="doughnutData" :options="doughnutOptions" />
        </div>
      </div>

      <!-- Graphique Courbe Simple (2/3 de l'espace) -->
      <div class="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 lg:col-span-2">
        <h3 class="text-gray-300 font-semibold mb-4">Commandes traitées (Derniers 60 jours)</h3>
        <div class="h-64 relative">
          <!-- TODO : Connecter ce graphique aux données réelles plus tard -->
          <Line :data="lineTraiteesData" :options="lineOptions" />
        </div>
      </div>
    </div>

    <!-- 3ème Section : Comparaison globale -->
    <div class="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 class="text-gray-300 font-semibold">Comparaison des créations (Mois N vs Mois N-1)</h3>
        <!-- Boutons filtres (statiques pour le moment) -->
        <select
          class="mt-2 sm:mt-0 bg-slate-700 text-gray-300 border border-slate-600 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        >
          <!-- Tu pourras rendre ce select dynamique plus tard -->
          <option>Mois actuel vs Mois précédent</option>
        </select>
      </div>

      <div v-if="dashboardStore.isLoading" class="h-72 flex items-center justify-center">
        <span class="text-slate-500 animate-pulse">Analyse comparative en cours...</span>
      </div>
      <div v-else class="h-72 relative">
        <Line :data="lineComparaisonData" :options="lineOptions" />
      </div>
    </div>
  </div>
</template>

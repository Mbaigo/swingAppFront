<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

// Chargement des données au montage du composant
onMounted(() => {
  dashboardStore.fetchDashboardData()
})

// --------------------------------------------------
// 1. DISQUE : Commandes de la semaine (DYNAMIQUE)
// --------------------------------------------------
const doughnutData = computed(() => ({
  labels: ['Créées', 'En confection', 'Essayages', 'Terminées'],
  datasets: [
    {
      data: dashboardStore.repartitionStatut,
      // Ambre, Bleu, Violet (pour l'essayage), Vert
      backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}))
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
// 3. COURBE COMPARATIVE : (Statique pour le moment)
// --------------------------------------------------
// --------------------------------------------------
// 3. COURBE COMPARATIVE (DYNAMIQUE) : Mois N vs N-1
// --------------------------------------------------
const lineComparaisonData = computed(() => {
  // Fonction utilitaire pour regrouper les commandes par "Semaine" (1 à 4)
  const grouperParSemaine = (commandes: any[]) => {
    const semaines = [0, 0, 0, 0] // 4 semaines
    commandes.forEach((cmd) => {
      const jour = new Date(cmd.dateCreation).getDate()
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
</script>

<template>
  <div class="space-y-6 pb-8">
    <!-- En-tête de page -->
    <div>
      <h1 class="text-2xl font-bold text-gray-300">Vue d'ensemble</h1>
      <p class="text-gray-400 text-sm">Statistiques de votre atelier de confection</p>
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
        <h3 class="text-gray-300 text-sm font-medium">Commandes en cours</h3>
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
        <h3 class="text-gray-300 text-sm font-medium">Chiffre de la semaine</h3>
        <div
          v-if="dashboardStore.isLoading"
          class="animate-pulse h-9 bg-slate-700 rounded mt-2 w-24"
        ></div>
        <p v-else class="text-3xl font-bold text-emerald-500 mt-2">
          {{ dashboardStore.chiffreSemaine }} XAF
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
          <option>Août vs Juillet</option>
          <option>Juillet vs Juin</option>
        </select>
      </div>
      <div class="h-72 relative">
        <Line :data="lineComparaisonData" :options="lineOptions" />
      </div>
    </div>
  </div>
</template>

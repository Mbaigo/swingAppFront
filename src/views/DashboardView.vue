<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
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

// --------------------------------------------------
// 1. DISQUE : Commandes de la semaine par statut
// --------------------------------------------------
const doughnutData = ref({
  labels: ['En attente', 'En cours', 'Prêtes', 'Livrées'],
  datasets: [
    {
      data: [5, 12, 4, 8],
      // Couleurs assorties à Tailwind (Ambre, Bleu, Émeraude, Indigo)
      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#6366f1'],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
})
const doughnutOptions = ref({ responsive: true, maintainAspectRatio: false })

// --------------------------------------------------
// 2. COURBE SIMPLE : Commandes traitées entre 2 mois
// --------------------------------------------------
const lineTraiteesData = ref({
  labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
  datasets: [
    {
      label: 'Volume traité (Juillet - Août)',
      data: [12, 15, 10, 18, 22, 25, 20, 30],
      borderColor: '#10b981', // Émeraude
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4, // Courbe arrondie
    },
  ],
})

// --------------------------------------------------
// 3. COURBE COMPARATIVE : Commandes créées (Mois A vs B)
// --------------------------------------------------
const lineComparaisonData = ref({
  labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'],
  datasets: [
    {
      label: 'Juillet',
      data: [20, 25, 18, 30],
      borderColor: '#94a3b8', // Gris (Mois précédent)
      borderDash: [5, 5], // Ligne pointillée
      tension: 0.4,
    },
    {
      label: 'Août',
      data: [28, 32, 25, 40],
      borderColor: '#3b82f6', // Bleu (Mois en cours)
      tension: 0.4,
    },
  ],
})

const lineOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' },
  },
})
</script>

<template>
  <div class="space-y-6 pb-8">
    <!-- En-tête de page -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">Vue d'ensemble</h1>
      <p class="text-gray-500 text-sm">Statistiques de votre atelier de confection</p>
    </div>

    <!-- 1ère Section : Cartes statistiques rapides -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 class="text-gray-500 text-sm font-medium">À livrer aujourd'hui</h3>
        <p class="text-3xl font-bold text-gray-800 mt-2">4</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 class="text-gray-500 text-sm font-medium">Commandes en cours</h3>
        <p class="text-3xl font-bold text-blue-600 mt-2">12</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 class="text-gray-500 text-sm font-medium">Chiffre de la semaine</h3>
        <p class="text-3xl font-bold text-emerald-600 mt-2">450 €</p>
      </div>
    </div>

    <!-- 2ème Section : Analyse de la semaine et traitement -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Graphique Disque (1/3 de l'espace) -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
        <h3 class="text-gray-800 font-semibold mb-4">Répartition de la semaine</h3>
        <div class="h-64 relative">
          <Doughnut :data="doughnutData" :options="doughnutOptions" />
        </div>
      </div>

      <!-- Graphique Courbe Simple (2/3 de l'espace) -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
        <h3 class="text-gray-800 font-semibold mb-4">Commandes traitées (Derniers 60 jours)</h3>
        <div class="h-64 relative">
          <Line :data="lineTraiteesData" :options="lineOptions" />
        </div>
      </div>
    </div>

    <!-- 3ème Section : Comparaison globale -->
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 class="text-gray-800 font-semibold">Comparaison des créations (Mois N vs Mois N-1)</h3>
        <!-- Boutons filtres (statiques pour le moment) -->
        <select
          class="mt-2 sm:mt-0 bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
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

<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { Doughnut, Line, Bar } from 'vue-chartjs'
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
  BarElement,
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
  BarElement,
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
// --------------------------------------------------
// 2. COURBE : Volume traité (8 dernières semaines)
// --------------------------------------------------
const lineTraiteesData = computed(() => {
  // Les labels pour les 8 dernières semaines (env. 2 mois)
  const labels = ['S-7', 'S-6', 'S-5', 'S-4', 'S-3', 'S-2', 'S-1', 'Cette sem.']
  const donneesHebdo = [0, 0, 0, 0, 0, 0, 0, 0]

  const aujourdHui = new Date()

  // On récupère les données depuis le store (qui contient déjà l'historique récent)
  const commandes = dashboardStore.commandesSixMois || []

  commandes.forEach((cmd) => {
    const dateStr = cmd.dateCommande || cmd.dateCreation
    if (!dateStr) return

    const dateCmd = new Date(dateStr)

    // Calcul du nombre de jours écoulés depuis la date de création de la commande
    const differenceEnTemps = aujourdHui.getTime() - dateCmd.getTime()
    const differenceEnJours = Math.floor(differenceEnTemps / (1000 * 3600 * 24))

    // On ne conserve que ce qui est compris dans les 56 derniers jours (8 semaines x 7 jours)
    if (differenceEnJours >= 0 && differenceEnJours < 56) {
      // Logique d'indexation :
      // 0 à 6 jours = index 7 (Cette sem.)
      // 49 à 55 jours = index 0 (S-7)
      const indexInverse = Math.floor(differenceEnJours / 7)
      const index = 7 - indexInverse

      // Si tu souhaites n'afficher que les commandes réellement "traitées" / terminées,
      // tu peux décommenter la condition ci-dessous :
      // if (cmd.statut === 'TERMINEE') {

      donneesHebdo[index]++

      // }
    }
  })

  return {
    labels: labels,
    datasets: [
      {
        label: 'Volume de commandes',
        data: donneesHebdo,
        borderColor: '#10b981', // Vert émeraude
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }
})

// --------------------------------------------------
// 3. COURBE COMPARATIVE (DYNAMIQUE) : Mois N vs N-1
// --------------------------------------------------
// --------------------------------------------------
// 3. BAR CHART : Évolution sur les 6 derniers mois
// --------------------------------------------------
const barSixMoisData = computed(() => {
  const labels = []
  const moisNoms = [
    'Janv.',
    'Févr.',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juil.',
    'Août',
    'Sept.',
    'Oct.',
    'Nov.',
    'Déc.',
  ]

  const dateActuelle = new Date()

  // 1. Générer les noms des 6 derniers mois dynamiquement
  for (let i = 5; i >= 0; i--) {
    const d = new Date(dateActuelle.getFullYear(), dateActuelle.getMonth() - i, 1)
    labels.push(moisNoms[d.getMonth()])
  }

  const totauxMensuels = [0, 0, 0, 0, 0, 0]

  // 2. Récupérer les données depuis le store
  // ⚠️ Important : Il faudra s'assurer que le store / backend renvoie bien cette liste
  const commandes = dashboardStore.commandesSixMois || []

  // 3. Ventiler chaque commande dans le mois correspondant
  commandes.forEach((cmd) => {
    const dateStr = cmd.dateCommande || cmd.dateCreation
    if (!dateStr) return

    const dateCmd = new Date(dateStr)

    // Calcul de l'écart en mois par rapport au mois actuel
    const diffMois =
      (dateActuelle.getFullYear() - dateCmd.getFullYear()) * 12 +
      (dateActuelle.getMonth() - dateCmd.getMonth())

    // Si la commande est bien dans la fenêtre des 6 derniers mois
    if (diffMois >= 0 && diffMois <= 5) {
      const index = 5 - diffMois // Le mois actuel est toujours à la fin du tableau (index 5)
      totauxMensuels[index]++
    }
  })

  return {
    labels: labels,
    datasets: [
      {
        label: 'Commandes créées',
        data: totauxMensuels,
        backgroundColor: '#3b82f6', // Bleu vif
        borderRadius: 4,
        barPercentage: 0.6,
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
    <!-- 3ème Section : Évolution 6 mois -->
    <div class="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 class="text-gray-300 font-semibold">Évolution des créations (6 derniers mois)</h3>
      </div>

      <div v-if="dashboardStore.isLoading" class="h-72 flex items-center justify-center">
        <span class="text-slate-500 animate-pulse">Analyse en cours...</span>
      </div>
      <div v-else class="h-72 relative">
        <Bar :data="barSixMoisData" :options="barOptions" />
      </div>
    </div>
  </div>
</template>

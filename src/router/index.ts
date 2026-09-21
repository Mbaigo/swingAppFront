// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import CommandesView from '@/views/CommandesView.vue'
import ClientsView from '@/views/ClientsView.vue'
import RendezVousView from '@/views/Rendez-vousView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout, // Le composant parent
      children: [
        // Toutes les pages à l'intérieur du layout
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
        },
        {
          // 👈 2. Ajout de la route
          path: 'commandes',
          name: 'commandes',
          component: CommandesView,
        },
        {
          // 👈 2. Ajout de la route
          path: 'Clients',
          name: 'clients',
          component: ClientsView,
        },
        {
          // 👈 2. Ajout de la route
          path: 'rendez-vous',
          name: 'rendez-vous',
          component: RendezVousView,
        },
        // On ajoutera /commandes et /clients ici plus tard
      ],
    },
  ],
})

export default router

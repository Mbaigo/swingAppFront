// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import CommandesView from '@/views/CommandesView.vue'

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
        // On ajoutera /commandes et /clients ici plus tard
      ],
    },
  ],
})

export default router

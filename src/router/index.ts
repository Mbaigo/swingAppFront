// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import CommandesView from '@/views/CommandesView.vue'
import ClientsView from '@/views/ClientsView.vue'
import RendezVousView from '@/views/Rendez-vousView.vue'
import { hasAnyRole, type AppRole } from '@/utils/authRoles'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    roles?: AppRole[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
          meta: {
            title: 'Tableau de bord',
            roles: ['MANAGER', 'COMMERCIAL'],
          },
        },
        {
          path: 'commandes',
          name: 'commandes',
          component: CommandesView,
          meta: {
            title: 'Commandes',
            roles: ['MANAGER', 'TAILOR', 'COMMERCIAL'],
          },
        },
        {
          path: 'clients',
          name: 'clients',
          component: ClientsView,
          meta: {
            title: 'Clients',
            roles: ['MANAGER', 'COMMERCIAL'],
          },
        },
        {
          path: 'rendez-vous',
          name: 'rendez-vous',
          component: RendezVousView,
          meta: {
            title: 'Rendez-vous',
            roles: ['MANAGER', 'COMMERCIAL'],
          },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const requiredRoles = to.meta.roles
  if (!requiredRoles || requiredRoles.length === 0) {
    return true
  }

  if (hasAnyRole(requiredRoles)) {
    return true
  }

  // Redirige un TAILOR qui arrive sur "/" vers "/commandes" en évitant toute boucle infinie
  if (to.name !== 'commandes' && hasAnyRole(['MANAGER', 'TAILOR', 'COMMERCIAL'])) {
    return { name: 'commandes' }
  }

  // Cas où l'utilisateur connecté dans Keycloak n'a aucun rôle applicatif mappé
  return false
})

export default router

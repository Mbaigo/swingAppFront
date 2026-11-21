<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import keycloak from '@/plugins/keycloak'
import { getAppRoles, hasAnyRole } from '@/utils/authRoles'

const route = useRoute()

// Fonction de déconnexion via Keycloak
const logout = () => {
  keycloak.logout({
    redirectUri: window.location.origin,
  })
}

// Extraction du nom et du rôle mappé depuis le jeton JWT
const userName =
  keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.given_name || 'Admin'
const userInitial = userName.charAt(0).toUpperCase()
const userRoles = computed(() => getAppRoles())
const primaryRole = computed(() => userRoles.value[0] ?? 'AUCUN RÔLE')

// Titre dynamique synchronisé avec la route active
const pageTitle = computed(() => route.meta.title ?? 'Dashboard')
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Sidebar (Menu latéral) -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col">
      <div class="h-16 flex items-center justify-center border-b border-slate-700">
        <h1 class="text-xl font-bold tracking-wider">🧵 Lex-fashion</h1>
      </div>
      <nav class="flex-1 p-4 space-y-2">
        <RouterLink
          v-if="hasAnyRole(['MANAGER', 'TAILOR', 'COMMERCIAL'])"
          to="/"
          class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          exact-active-class="bg-blue-600 hover:bg-blue-600 text-white"
        >
          Tableau de bord
        </RouterLink>
        <RouterLink
          v-if="hasAnyRole(['MANAGER', 'TAILOR', 'COMMERCIAL'])"
          to="/commandes"
          class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          exact-active-class="bg-blue-600 hover:bg-blue-600 text-white"
        >
          Commandes
        </RouterLink>
        <RouterLink
          v-if="hasAnyRole(['MANAGER', 'COMMERCIAL'])"
          to="/rendez-vous"
          class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          exact-active-class="bg-blue-600 hover:bg-blue-600 text-white"
        >
          Rendez-vous
        </RouterLink>
        <RouterLink
          v-if="hasAnyRole(['MANAGER', 'TAILOR', 'COMMERCIAL'])"
          to="/clients"
          class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          exact-active-class="bg-blue-600 hover:bg-blue-600 text-white"
        >
          Clients
        </RouterLink>
      </nav>
    </aside>

    <!-- Conteneur principal (Header + Contenu) -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header (Barre supérieure) -->
      <header
        class="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shadow-sm"
      >
        <h2 class="text-lg font-medium text-white">{{ pageTitle }}</h2>

        <!-- Zone Utilisateur & Déconnexion -->
        <div class="flex items-center space-x-6">
          <!-- Informations utilisateur dynamiques -->
          <div class="flex items-center space-x-3">
            <div class="text-right">
              <span class="text-sm text-slate-300 capitalize block leading-tight">
                {{ userName }}
              </span>
              <span class="text-[11px] font-mono text-emerald-400 block leading-tight">
                {{ primaryRole }}
              </span>
            </div>
            <div
              class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md"
            >
              {{ userInitial }}
            </div>
          </div>

          <!-- Bouton Déconnexion -->
          <div class="border-l border-slate-700 pl-4">
            <button
              @click="logout"
              title="Se déconnecter"
              class="flex items-center space-x-2 text-slate-400 hover:text-red-400 transition-colors bg-transparent hover:bg-slate-800 p-2 rounded-lg outline-none"
            >
              <!-- Icône SVG -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span class="text-sm font-medium hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Zone de contenu dynamique -->
      <main class="flex-1 bg-slate-700 overflow-x-hidden overflow-y-auto p-6">
        <div
          v-if="userRoles.length === 0"
          class="max-w-lg mx-auto mt-16 bg-slate-800 border border-amber-500/40 rounded-xl p-6 text-center text-slate-200"
        >
          <h3 class="text-lg font-semibold text-amber-400 mb-2">Accès non configuré</h3>
          <p class="text-sm text-slate-400">
            Votre compte Keycloak ne possède aucun rôle applicatif autorisé. Contactez un
            administrateur.
          </p>
        </div>
        <RouterView v-else />
      </main>
    </div>
  </div>
</template>

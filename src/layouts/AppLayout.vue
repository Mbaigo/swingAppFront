<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Sidebar (Menu latéral) -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col">
      <div class="h-16 flex items-center justify-center border-b border-slate-700">
        <h1 class="text-xl font-bold tracking-wider">✂️ SPE FASHION</h1>
      </div>
      <nav class="flex-1 p-4 space-y-2">
        <!-- active-class permet de styliser le lien de la page actuelle -->
        <RouterLink
          to="/"
          class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          active-class="bg-blue-600 hover:bg-blue-600 text-white"
        >
          Tableau de bord
        </RouterLink>
        <RouterLink
          to="/commandes"
          class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          active-class="bg-blue-600 hover:bg-blue-600 text-white"
        >
          Commandes
        </RouterLink>
        <RouterLink
          to="/clients"
          class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          active-class="bg-blue-600 hover:bg-blue-600 text-white"
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
        <h2 class="text-lg font-medium text-white">Dashboard</h2>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-slate-300">Admin</span>
          <div
            class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold"
          >
            A
          </div>
        </div>
      </header>

      <!-- Zone de contenu dynamique -->
      <main class="flex-1 bg-slate-700 overflow-x-hidden overflow-y-auto p-6">
        <RouterView />
        <!-- C'est ici que les pages vont s'afficher -->
      </main>
    </div>
  </div>
</template>

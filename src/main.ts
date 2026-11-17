import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import keycloak from './plugins/keycloak'
import './assets/main.css'

const initApp = async () => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required', // Redirige automatiquement vers le login si non connecté
      checkLoginIframe: false,
    })

    if (authenticated) {
      // Configuration optionnelle pour rafraîchir le token automatiquement (toutes les minutes)
      setInterval(() => {
        keycloak.updateToken(70).catch(() => {
          console.error('Échec du rafraîchissement du token')
          keycloak.logout()
        })
      }, 60000)

      const app = createApp(App)
      app.use(createPinia())
      app.use(router)
      app.mount('#app')
    } else {
      window.location.reload()
    }
  } catch (error) {
    console.error('Erreur d’initialisation de Keycloak', error)
  }
}

initApp()

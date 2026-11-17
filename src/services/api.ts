// src/services/api.ts
import keycloak from '@/plugins/keycloak'
import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:8088/api/v1', // Adapte le port si ton Spring Boot tourne ailleurs
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour injecter le token JWT
api.interceptors.request.use(
  (config) => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Intercepteur pour gérer l'expiration de session (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expirée, déconnexion...')
      keycloak.logout()
    }
    return Promise.reject(error)
  },
)

export default api

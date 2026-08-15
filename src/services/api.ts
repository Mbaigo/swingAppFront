// src/services/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:8088/api/v1', // Adapte le port si ton Spring Boot tourne ailleurs
  headers: {
    'Content-Type': 'application/json',
  },
})

// On pourra ajouter ici des intercepteurs plus tard (ex: pour le token JWT)

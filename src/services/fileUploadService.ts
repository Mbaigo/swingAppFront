import { api } from './api'

export const fileUploadService = {
  /**
   * Envoie une liste d'images au serveur et retourne leurs URLs
   * @param fichiers Liste des fichiers (File) sélectionnés par l'utilisateur
   * @returns Promesse contenant un tableau de chaînes de caractères (URLs)
   */
  async uploadImages(fichiers: File[]) {
    const formData = new FormData()

    // On ajoute chaque fichier dans le FormData sous la clé "fichiers"
    // Cette clé DOIT correspondre au @RequestParam("fichiers") de Spring Boot
    fichiers.forEach((file) => {
      formData.append('fichiers', file)
    })

    // L'instance Axios (api) gère automatiquement le header 'Content-Type': 'multipart/form-data'
    // avec la bonne boundary lorsqu'elle détecte un objet FormData.
    return api.post<string[]>('/fichiers/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

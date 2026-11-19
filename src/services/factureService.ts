// src/services/factureService.ts
import api from '@/services/api'

export type ModeOuverturePdf = 'download' | 'preview'

function extraireNomFichier(contentDisposition: string | undefined, commandeId: number): string {
  if (!contentDisposition) {
    return `Facture_LexFashion_${commandeId}.pdf`
  }
  const match = contentDisposition.match(/filename="?([^"]+)"?/i)
  return match?.[1] ?? `Facture_LexFashion_${commandeId}.pdf`
}

export async function recupererFacturePdf(
  commandeId: number,
  mode: ModeOuverturePdf = 'download',
): Promise<void> {
  const response = await api.get<Blob>(`/commandes/${commandeId}/facture`, {
    responseType: 'blob',
  })

  const blob = new Blob([response.data], { type: 'application/pdf' })
  const blobUrl = window.URL.createObjectURL(blob)

  if (mode === 'preview') {
    window.open(blobUrl, '_blank', 'noopener,noreferrer')
    // Laisse le temps au nouvel onglet de charger le PDF avant de libérer la mémoire
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000)
    return
  }

  const contentDisposition = response.headers['content-disposition'] as string | undefined
  const fileName = extraireNomFichier(contentDisposition, commandeId)

  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

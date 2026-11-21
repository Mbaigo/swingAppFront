import keycloak from '@/plugins/keycloak'

export type AppRole = 'MANAGER' | 'TAILOR' | 'COMMERCIAL'

const KEYCLOAK_TO_APP_ROLES: Record<string, AppRole[]> = {
  ADMIN: ['MANAGER'],
  USER: ['TAILOR'],
  RECEPTION: ['COMMERCIAL'],
}

export function getAppRoles(): AppRole[] {
  const kcRoles: string[] = keycloak.tokenParsed?.realm_access?.roles ?? []
  const mapped = kcRoles.flatMap((role) => KEYCLOAK_TO_APP_ROLES[role.toUpperCase()] ?? [])
  return [...new Set(mapped)]
}

export function hasRole(role: AppRole): boolean {
  return getAppRoles().includes(role)
}

export function hasAnyRole(roles: AppRole[]): boolean {
  const userRoles = getAppRoles()
  return roles.some((role) => userRoles.includes(role))
}

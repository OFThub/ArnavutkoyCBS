// Rol hiyerarşisi ve modül erişim kontrolü; RLS ile aynı kuralın istemci tarafındaki karşılığı.

import type { Access, Role } from './types'

const RANK: Record<Role, number> = { public: 0, personel: 1, yonetici: 2 }

export function canAccess(role: Role, access: Access): boolean {
  return access === 'public' || RANK[role] >= RANK.personel
}

export function canWrite(role: Role): boolean {
  return RANK[role] >= RANK.personel
}

export function isAdmin(role: Role): boolean {
  return role === 'yonetici'
}

export function parseRole(value: unknown): Role {
  return value === 'personel' || value === 'yonetici' ? value : 'public'
}

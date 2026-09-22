import { Role } from '@prisma/client';

// ─── Permission definitions ───────────────────────────────────

export const PERMISSIONS = {
  // Content
  'news:read':           [Role.VIEWER, Role.EDITOR, Role.REVIEWER, Role.DEVELOPER, Role.EDITOR_IN_CHIEF, Role.ADMISSIONS, Role.DIRECTOR],
  'news:create':         [Role.EDITOR, Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'news:edit_own':       [Role.EDITOR, Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'news:edit_any':       [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'news:delete':         [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'news:publish':        [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'news:review':         [Role.REVIEWER, Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'news:breaking':       [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'news:featured':       [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],

  // Users
  'users:read':          [Role.ADMISSIONS, Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'users:approve':       [Role.ADMISSIONS, Role.DIRECTOR],
  'users:reject':        [Role.ADMISSIONS, Role.DIRECTOR],
  'users:manage_roles':  [Role.DIRECTOR],
  'users:manage_editors':[Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'users:suspend':       [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'users:delete':        [Role.DIRECTOR],

  // Design/Theme
  'design:view':         [Role.DEVELOPER, Role.DIRECTOR],
  'design:submit':       [Role.DEVELOPER, Role.DIRECTOR],
  'design:approve':      [Role.DIRECTOR],
  'design:apply':        [Role.DIRECTOR], // Director applies immediately
  'design:force_apply':  [Role.DIRECTOR],

  // Elections
  'elections:read':      [Role.VIEWER, Role.EDITOR, Role.REVIEWER, Role.DEVELOPER, Role.EDITOR_IN_CHIEF, Role.ADMISSIONS, Role.DIRECTOR],
  'elections:vote':      [Role.VIEWER, Role.EDITOR, Role.REVIEWER, Role.DEVELOPER, Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'elections:manage':    [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'elections:create':    [Role.DIRECTOR],
  'elections:results':   [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],

  // Newspaper
  'newspaper:read':      [Role.VIEWER, Role.EDITOR, Role.REVIEWER, Role.DEVELOPER, Role.EDITOR_IN_CHIEF, Role.ADMISSIONS, Role.DIRECTOR],
  'newspaper:create':    [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'newspaper:publish':   [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'newspaper:delete':    [Role.DIRECTOR],

  // Settings
  'settings:read':       [Role.DIRECTOR, Role.EDITOR_IN_CHIEF, Role.DEVELOPER],
  'settings:write':      [Role.DIRECTOR],
  'settings:theme':      [Role.DEVELOPER, Role.DIRECTOR],

  // Departments
  'departments:manage':  [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],

  // Analytics/Logs
  'analytics:read':      [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],
  'logs:read':           [Role.DIRECTOR],

  // Counter
  'counter:manage':      [Role.EDITOR_IN_CHIEF, Role.DIRECTOR],

  // Admin panel access
  'admin:access':        [Role.EDITOR, Role.REVIEWER, Role.DEVELOPER, Role.EDITOR_IN_CHIEF, Role.ADMISSIONS, Role.DIRECTOR],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly Role[];
  return allowed.includes(role);
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => can(role, p));
}

export function canAll(role: Role, permissions: Permission[]): boolean {
  return permissions.every(p => can(role, p));
}

// Role hierarchy — higher = more permissions
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.VIEWER]:          0,
  [Role.EDITOR]:          1,
  [Role.REVIEWER]:        2,
  [Role.DEVELOPER]:       2,
  [Role.ADMISSIONS]:      3,
  [Role.EDITOR_IN_CHIEF]: 4,
  [Role.DIRECTOR]:        10,
};

export function isHigherRole(a: Role, b: Role): boolean {
  return ROLE_HIERARCHY[a] > ROLE_HIERARCHY[b];
}

// Arabic role labels
export const ROLE_LABELS_AR: Record<Role, string> = {
  [Role.VIEWER]:          'زائر',
  [Role.EDITOR]:          'محرر',
  [Role.REVIEWER]:        'مراجع',
  [Role.DEVELOPER]:       'مبرمج',
  [Role.EDITOR_IN_CHIEF]: 'رئيس التحرير',
  [Role.ADMISSIONS]:      'عمادة القبول',
  [Role.DIRECTOR]:        'رئيس الوكالة',
};

export const ROLE_COLORS: Record<Role, string> = {
  [Role.VIEWER]:          '#737373',
  [Role.EDITOR]:          '#2563eb',
  [Role.REVIEWER]:        '#059669',
  [Role.DEVELOPER]:       '#7c3aed',
  [Role.EDITOR_IN_CHIEF]: '#dc2626',
  [Role.ADMISSIONS]:      '#b45309',
  [Role.DIRECTOR]:        '#0a0a0a',
};

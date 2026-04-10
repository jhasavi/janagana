// Granular Permissions System

export const PERMISSIONS = {
  MEMBERS: {
    VIEW: 'members:view',
    CREATE: 'members:create',
    EDIT: 'members:edit',
    DELETE: 'members:delete',
    IMPORT: 'members:import',
    EXPORT: 'members:export',
  },
  EVENTS: {
    VIEW: 'events:view',
    CREATE: 'events:create',
    EDIT: 'events:edit',
    DELETE: 'events:delete',
    MANAGE_REGISTRATIONS: 'events:manage_registrations',
  },
  VOLUNTEERS: {
    VIEW: 'volunteers:view',
    CREATE: 'volunteers:create',
    EDIT: 'volunteers:edit',
    DELETE: 'volunteers:delete',
    APPROVE_APPLICATIONS: 'volunteers:approve_applications',
  },
  CLUBS: {
    VIEW: 'clubs:view',
    CREATE: 'clubs:create',
    EDIT: 'clubs:edit',
    DELETE: 'clubs:delete',
    MANAGE_MEMBERS: 'clubs:manage_members',
  },
  PAYMENTS: {
    VIEW: 'payments:view',
    PROCESS_REFUNDS: 'payments:process_refunds',
    MANAGE_INVOICES: 'payments:manage_invoices',
  },
  COMMUNICATIONS: {
    VIEW: 'communications:view',
    SEND_CAMPAIGNS: 'communications:send_campaigns',
    MANAGE_TEMPLATES: 'communications:manage_templates',
  },
  ANALYTICS: {
    VIEW: 'analytics:view',
  },
  SETTINGS: {
    VIEW: 'settings:view',
    EDIT: 'settings:edit',
    MANAGE_TEAM: 'settings:manage_team',
  },
} as const;

// Extract all permission string values as a union type
export type Permission =
  | typeof PERMISSIONS.MEMBERS[keyof typeof PERMISSIONS.MEMBERS]
  | typeof PERMISSIONS.EVENTS[keyof typeof PERMISSIONS.EVENTS]
  | typeof PERMISSIONS.VOLUNTEERS[keyof typeof PERMISSIONS.VOLUNTEERS]
  | typeof PERMISSIONS.CLUBS[keyof typeof PERMISSIONS.CLUBS]
  | typeof PERMISSIONS.PAYMENTS[keyof typeof PERMISSIONS.PAYMENTS]
  | typeof PERMISSIONS.COMMUNICATIONS[keyof typeof PERMISSIONS.COMMUNICATIONS]
  | typeof PERMISSIONS.ANALYTICS[keyof typeof PERMISSIONS.ANALYTICS]
  | typeof PERMISSIONS.SETTINGS[keyof typeof PERMISSIONS.SETTINGS];

export type PermissionCategory = keyof typeof PERMISSIONS;

export type RoleType = 'OWNER' | 'ADMIN' | 'STAFF' | 'READONLY' | 'CUSTOM';

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  permissions: Permission[];
  description?: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  tenantId: string;
  assignedBy: string;
  assignedAt: string;
}

export const ROLE_PRESETS: Record<RoleType, Permission[]> = {
  OWNER: [
    // Members - all permissions
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.MEMBERS.CREATE,
    PERMISSIONS.MEMBERS.EDIT,
    PERMISSIONS.MEMBERS.DELETE,
    PERMISSIONS.MEMBERS.IMPORT,
    PERMISSIONS.MEMBERS.EXPORT,
    
    // Events - all permissions
    PERMISSIONS.EVENTS.VIEW,
    PERMISSIONS.EVENTS.CREATE,
    PERMISSIONS.EVENTS.EDIT,
    PERMISSIONS.EVENTS.DELETE,
    PERMISSIONS.EVENTS.MANAGE_REGISTRATIONS,
    
    // Volunteers - all permissions
    PERMISSIONS.VOLUNTEERS.VIEW,
    PERMISSIONS.VOLUNTEERS.CREATE,
    PERMISSIONS.VOLUNTEERS.EDIT,
    PERMISSIONS.VOLUNTEERS.DELETE,
    PERMISSIONS.VOLUNTEERS.APPROVE_APPLICATIONS,
    
    // Clubs - all permissions
    PERMISSIONS.CLUBS.VIEW,
    PERMISSIONS.CLUBS.CREATE,
    PERMISSIONS.CLUBS.EDIT,
    PERMISSIONS.CLUBS.DELETE,
    PERMISSIONS.CLUBS.MANAGE_MEMBERS,
    
    // Payments - all permissions
    PERMISSIONS.PAYMENTS.VIEW,
    PERMISSIONS.PAYMENTS.PROCESS_REFUNDS,
    PERMISSIONS.PAYMENTS.MANAGE_INVOICES,
    
    // Communications - all permissions
    PERMISSIONS.COMMUNICATIONS.VIEW,
    PERMISSIONS.COMMUNICATIONS.SEND_CAMPAIGNS,
    PERMISSIONS.COMMUNICATIONS.MANAGE_TEMPLATES,
    
    // Analytics
    PERMISSIONS.ANALYTICS.VIEW,
    
    // Settings - all permissions
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MANAGE_TEAM,
  ],
  
  ADMIN: [
    // Members - all permissions
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.MEMBERS.CREATE,
    PERMISSIONS.MEMBERS.EDIT,
    PERMISSIONS.MEMBERS.DELETE,
    PERMISSIONS.MEMBERS.IMPORT,
    PERMISSIONS.MEMBERS.EXPORT,
    
    // Events - all permissions
    PERMISSIONS.EVENTS.VIEW,
    PERMISSIONS.EVENTS.CREATE,
    PERMISSIONS.EVENTS.EDIT,
    PERMISSIONS.EVENTS.DELETE,
    PERMISSIONS.EVENTS.MANAGE_REGISTRATIONS,
    
    // Volunteers - all permissions
    PERMISSIONS.VOLUNTEERS.VIEW,
    PERMISSIONS.VOLUNTEERS.CREATE,
    PERMISSIONS.VOLUNTEERS.EDIT,
    PERMISSIONS.VOLUNTEERS.DELETE,
    PERMISSIONS.VOLUNTEERS.APPROVE_APPLICATIONS,
    
    // Clubs - all permissions
    PERMISSIONS.CLUBS.VIEW,
    PERMISSIONS.CLUBS.CREATE,
    PERMISSIONS.CLUBS.EDIT,
    PERMISSIONS.CLUBS.DELETE,
    PERMISSIONS.CLUBS.MANAGE_MEMBERS,
    
    // Payments - all permissions
    PERMISSIONS.PAYMENTS.VIEW,
    PERMISSIONS.PAYMENTS.PROCESS_REFUNDS,
    PERMISSIONS.PAYMENTS.MANAGE_INVOICES,
    
    // Communications - all permissions
    PERMISSIONS.COMMUNICATIONS.VIEW,
    PERMISSIONS.COMMUNICATIONS.SEND_CAMPAIGNS,
    PERMISSIONS.COMMUNICATIONS.MANAGE_TEMPLATES,
    
    // Analytics
    PERMISSIONS.ANALYTICS.VIEW,
    
    // Settings - limited permissions (no team management)
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.EDIT,
  ],
  
  STAFF: [
    // Members - limited permissions
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.MEMBERS.CREATE,
    PERMISSIONS.MEMBERS.EDIT,
    
    // Events - all permissions
    PERMISSIONS.EVENTS.VIEW,
    PERMISSIONS.EVENTS.CREATE,
    PERMISSIONS.EVENTS.EDIT,
    PERMISSIONS.EVENTS.DELETE,
    PERMISSIONS.EVENTS.MANAGE_REGISTRATIONS,
    
    // Volunteers - all permissions
    PERMISSIONS.VOLUNTEERS.VIEW,
    PERMISSIONS.VOLUNTEERS.CREATE,
    PERMISSIONS.VOLUNTEERS.EDIT,
    PERMISSIONS.VOLUNTEERS.DELETE,
    PERMISSIONS.VOLUNTEERS.APPROVE_APPLICATIONS,
    
    // Clubs - view only
    PERMISSIONS.CLUBS.VIEW,
    
    // Payments - view only
    PERMISSIONS.PAYMENTS.VIEW,
    
    // Communications - all permissions
    PERMISSIONS.COMMUNICATIONS.VIEW,
    PERMISSIONS.COMMUNICATIONS.SEND_CAMPAIGNS,
    PERMISSIONS.COMMUNICATIONS.MANAGE_TEMPLATES,
    
    // Analytics
    PERMISSIONS.ANALYTICS.VIEW,
  ],
  
  READONLY: [
    // All view permissions only
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.EVENTS.VIEW,
    PERMISSIONS.VOLUNTEERS.VIEW,
    PERMISSIONS.CLUBS.VIEW,
    PERMISSIONS.PAYMENTS.VIEW,
    PERMISSIONS.COMMUNICATIONS.VIEW,
    PERMISSIONS.ANALYTICS.VIEW,
    PERMISSIONS.SETTINGS.VIEW,
  ],
  
  CUSTOM: [], // Will be populated dynamically
};

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  'MEMBERS',
  'EVENTS', 
  'VOLUNTEERS',
  'CLUBS',
  'PAYMENTS',
  'COMMUNICATIONS',
  'ANALYTICS',
  'SETTINGS',
];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).flatMap(
  (category) => Object.values(category)
);

export const hasPermission = (
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean => {
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

export const hasAllPermissions = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

export const getPermissionsByCategory = (category: PermissionCategory): Permission[] => {
  return Object.values(PERMISSIONS[category]);
};

export const getRoleDisplayName = (roleType: RoleType): string => {
  const names: Record<RoleType, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    STAFF: 'Staff',
    READONLY: 'Read Only',
    CUSTOM: 'Custom',
  };
  return names[roleType];
};

export const getPermissionDescription = (permission: Permission): string => {
  const descriptions: Record<Permission, string> = {
    [PERMISSIONS.MEMBERS.VIEW]: 'View member information and profiles',
    [PERMISSIONS.MEMBERS.CREATE]: 'Create new member accounts',
    [PERMISSIONS.MEMBERS.EDIT]: 'Edit member information and profiles',
    [PERMISSIONS.MEMBERS.DELETE]: 'Delete member accounts',
    [PERMISSIONS.MEMBERS.IMPORT]: 'Import members from external sources',
    [PERMISSIONS.MEMBERS.EXPORT]: 'Export member data',
    
    [PERMISSIONS.EVENTS.VIEW]: 'View events and event details',
    [PERMISSIONS.EVENTS.CREATE]: 'Create new events',
    [PERMISSIONS.EVENTS.EDIT]: 'Edit event information',
    [PERMISSIONS.EVENTS.DELETE]: 'Delete events',
    [PERMISSIONS.EVENTS.MANAGE_REGISTRATIONS]: 'Manage event registrations and attendance',
    
    [PERMISSIONS.VOLUNTEERS.VIEW]: 'View volunteer information and applications',
    [PERMISSIONS.VOLUNTEERS.CREATE]: 'Create volunteer opportunities',
    [PERMISSIONS.VOLUNTEERS.EDIT]: 'Edit volunteer information and opportunities',
    [PERMISSIONS.VOLUNTEERS.DELETE]: 'Delete volunteer opportunities',
    [PERMISSIONS.VOLUNTEERS.APPROVE_APPLICATIONS]: 'Approve or reject volunteer applications',
    
    [PERMISSIONS.CLUBS.VIEW]: 'View club information and details',
    [PERMISSIONS.CLUBS.CREATE]: 'Create new clubs',
    [PERMISSIONS.CLUBS.EDIT]: 'Edit club information',
    [PERMISSIONS.CLUBS.DELETE]: 'Delete clubs',
    [PERMISSIONS.CLUBS.MANAGE_MEMBERS]: 'Manage club memberships and rosters',
    
    [PERMISSIONS.PAYMENTS.VIEW]: 'View payment information and transactions',
    [PERMISSIONS.PAYMENTS.PROCESS_REFUNDS]: 'Process payment refunds',
    [PERMISSIONS.PAYMENTS.MANAGE_INVOICES]: 'Manage invoices and billing',
    
    [PERMISSIONS.COMMUNICATIONS.VIEW]: 'View communication history and campaigns',
    [PERMISSIONS.COMMUNICATIONS.SEND_CAMPAIGNS]: 'Send email campaigns and communications',
    [PERMISSIONS.COMMUNICATIONS.MANAGE_TEMPLATES]: 'Manage email templates and communication templates',
    
    [PERMISSIONS.ANALYTICS.VIEW]: 'View analytics and reports',
    
    [PERMISSIONS.SETTINGS.VIEW]: 'View organization settings',
    [PERMISSIONS.SETTINGS.EDIT]: 'Edit organization settings',
    [PERMISSIONS.SETTINGS.MANAGE_TEAM]: 'Manage team members and roles',
  };
  
  return descriptions[permission] || permission;
};

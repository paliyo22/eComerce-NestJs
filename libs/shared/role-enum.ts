export enum ERole {
  User = 'user',
  Seller = 'user-seller',
  Business = 'business',
  Admin = 'admin'
};

export const RoleGroup: Record<ERole, 'user' | 'business' | 'admin'> = {
  [ERole.User]: 'user',
  [ERole.Seller]: 'user',
  [ERole.Business]: 'business',
  [ERole.Admin]: 'admin'
};

export function getRoleGroup(role: ERole): 'user' | 'business' | 'admin' {
  return RoleGroup[role];
};

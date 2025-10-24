import { Permission } from '../types';

interface UsePermissionsResult {
  hasPermission: (permission: Permission) => boolean;
}

export const usePermissions = (currentUserPermissions: Permission[]): UsePermissionsResult => {
  const hasPermission = (permission: Permission): boolean => {
    return currentUserPermissions.includes(permission);
  };

  return {
    hasPermission,
  };
};
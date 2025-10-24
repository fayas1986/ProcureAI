import React, { useState, useEffect } from 'react';
import type { Role, Permission } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { ALL_PERMISSIONS, groupPermissionsByCategory } from './common/permissions';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: Omit<Role, '_id'>, id: string | null) => void;
  initialData: Role | null;
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const isEditMode = !!initialData;
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setName(initialData.name);
        setPermissions(new Set(initialData.permissions));
      } else {
        setName('');
        setPermissions(new Set());
      }
    }
  }, [isOpen, initialData]);

  const handlePermissionToggle = (permission: Permission) => {
    setPermissions(prev => {
      const newPermissions = new Set(prev);
      if (newPermissions.has(permission)) {
        newPermissions.delete(permission);
      } else {
        newPermissions.add(permission);
      }
      return newPermissions;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }
    const roleData = { name, permissions: Array.from(permissions) };
    onSave(roleData, initialData?._id || null);
  };

  if (!isOpen) return null;

  const groupedPermissions = groupPermissionsByCategory(ALL_PERMISSIONS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{isEditMode ? 'Edit Role' : 'Add New Role'}</h3>
            <p className="text-sm text-muted-foreground">Define the role and assign permissions.</p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label htmlFor="name" className="text-sm font-medium mb-1 block">Role Name</label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Permissions</h4>
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category}>
                        <h5 className="font-medium text-base mb-2">{category}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            {perms.map(p => (
                                <label key={p.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={permissions.has(p.id)}
                                        onChange={() => handlePermissionToggle(p.id)}
                                        className="h-4 w-4 mt-1 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <span className="text-sm font-medium">{p.name}</span>
                                        <p className="text-xs text-muted-foreground">{p.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Role'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;

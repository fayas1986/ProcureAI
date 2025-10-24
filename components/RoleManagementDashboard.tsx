import React, { useState, useMemo, useEffect } from 'react';
import type { Role, Permission, User } from '../types';
import { Button } from './common/Button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './common/Card';
import { Input } from './common/Input';
import RoleModal from './RoleModal';
import ConfirmationDialog from './common/ConfirmationDialog';
import useDebounce from '../hooks/useDebounce';
import { ALL_PERMISSIONS, groupPermissionsByCategory } from './common/permissions';


interface RoleManagementDashboardProps {
    roles: Role[];
    setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    users: User[];
    currentUser: User | null;
    currentUserPermissions: Permission[];
}

const RoleManagementDashboard: React.FC<RoleManagementDashboardProps> = ({ roles, setRoles, users, currentUser, currentUserPermissions }) => {
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const canManage = currentUserPermissions.includes('MANAGE_ROLES');

    const filteredRoles = useMemo(() => {
        let sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));
        if (!debouncedSearchTerm) {
            return sortedRoles;
        }
        return sortedRoles.filter(role => role.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    }, [roles, debouncedSearchTerm]);

    const selectedRole = useMemo(() => {
        if (!selectedRoleId) return null;
        return roles.find(r => r._id === selectedRoleId);
    }, [selectedRoleId, roles]);

    const usersInRole = useMemo(() => {
        if (!selectedRole) return [];
        return users.filter(u => u.roleId === selectedRole._id);
    }, [selectedRole, users]);

    useEffect(() => {
        // If the selected role is deleted from the main list, deselect it.
        if (selectedRoleId && !roles.find(r => r._id === selectedRoleId)) {
            setSelectedRoleId(null);
        }
    }, [roles, selectedRoleId]);


    const handleOpenAddModal = () => {
        setEditingRole(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (role: Role) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleSaveRole = (roleData: Omit<Role, '_id'>, id: string | null) => {
        if (id) { // Editing
            setRoles(prev => prev.map(r => (r._id === id ? { ...roleData, _id: id } : r)));
        } else { // Creating
            const newRole: Role = { ...roleData, _id: `R${Date.now()}` };
            setRoles(prev => [newRole, ...prev]);
        }
        setIsModalOpen(false);
    };

    const handleDeleteRequest = (role: Role) => {
        setRoleToDelete(role);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (roleToDelete) {
            setRoles(prev => prev.filter(r => r._id !== roleToDelete._id));
        }
        setIsConfirmOpen(false);
        setRoleToDelete(null);
    };

    return (
        <>
            <div className="flex flex-col gap-6 h-full">
                <div className="flex justify-between items-center">
                     <div>
                        <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
                        <p className="text-muted-foreground">Define user roles and their permissions.</p>
                    </div>
                    {canManage && <Button onClick={handleOpenAddModal} size="sm">Create New Role</Button>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                       <Card className="flex-grow flex flex-col">
                            <CardHeader className="p-4 border-b">
                                <CardTitle className="text-lg">Roles ({filteredRoles.length})</CardTitle>
                                <div className="relative pt-2">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <Input placeholder="Search roles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10"/>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-grow overflow-y-auto">
                                <ul className="divide-y divide-border">
                                    {filteredRoles.map(role => {
                                        const userCount = users.filter(u => u.roleId === role._id).length;
                                        return (
                                            <li key={role._id} onClick={() => setSelectedRoleId(role._id)} className={`p-3 cursor-pointer ${selectedRoleId === role._id ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold text-primary">{role.name}</p>
                                                    <span className="text-xs text-muted-foreground">{userCount} user{userCount !== 1 ? 's' : ''}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{role.permissions.length} permission(s)</p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                       <Card className="h-full">
                            {selectedRole ? (
                                <div className="flex flex-col h-full">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle>{selectedRole.name}</CardTitle>
                                                <CardDescription>{usersInRole.length} user(s) assigned to this role.</CardDescription>
                                            </div>
                                            {canManage && (
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(selectedRole)}>Edit</Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteRequest(selectedRole)} 
                                                        disabled={selectedRole._id === 'R003' || usersInRole.length > 0}
                                                        title={selectedRole._id === 'R003' ? 'The default Admin role cannot be deleted.' : usersInRole.length > 0 ? 'Cannot delete a role that has users assigned.' : ''}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow overflow-y-auto space-y-6">
                                        {usersInRole.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold mb-2 text-sm">Assigned Users</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {usersInRole.map(user => (
                                                        <span key={user._id} className="text-xs bg-muted px-2 py-1 rounded-full">{user.name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-semibold mb-2 text-sm">Permissions ({selectedRole.permissions.length})</h4>
                                            <div className="space-y-4">
                                                {Object.entries(groupPermissionsByCategory(ALL_PERMISSIONS)).map(([category, perms]) => {
                                                    const relevantPerms = perms.filter(p => selectedRole.permissions.includes(p.id));
                                                    if (relevantPerms.length === 0) return null;
                                                    
                                                    return (
                                                        <div key={category}>
                                                            <h5 className="font-medium text-base mb-2">{category}</h5>
                                                            <ul className="space-y-1 list-disc list-inside">
                                                                {relevantPerms.map(p => (
                                                                    <li key={p.id} className="text-sm text-muted-foreground">{p.name}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-muted-foreground">
                                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056h0c1.307-1.307 1.307-3.431 0-4.738z"></path></svg>
                                        <p className="mt-2 text-sm">Select a role to see its details.</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>

            <RoleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveRole}
                initialData={editingRole}
            />

            <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete Role: ${roleToDelete?.name || ''}?`}
                description="This will permanently delete the role. Users assigned to this role will lose their permissions."
                confirmText="Delete"
                confirmVariant="destructive"
            />
        </>
    );
};

export default RoleManagementDashboard;

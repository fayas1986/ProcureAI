import React, { useState, useMemo, useEffect } from 'react';
import type { User, Role, Permission } from '../types';
import { Button } from './common/Button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from './common/Card';
import { Input } from './common/Input';
import UserModal from './UserModal';
import ConfirmationDialog from './common/ConfirmationDialog';
import useDebounce from '../hooks/useDebounce';
import Fuse from 'fuse.js';
import Pagination from './common/Pagination';
import { Avatar } from './common/Avatar';
import ConnectivityIndicator from './common/ConnectivityIndicator';

interface UserManagementDashboardProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentUser: User | null;
    roles: Role[];
    currentUserPermissions: Permission[];
}

const ITEMS_PER_PAGE = 10;

const generateRandomPassword = (length = 10) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Ensure it contains at least one of each type for strength
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));

    // Fill remaining length with random characters from all sets
    for (let i = 4; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle the generated password to avoid a predictable pattern (e.g., symbol always at the end)
    return password.split('').sort(() => 0.5 - Math.random()).join('');
};

const UserManagementDashboard: React.FC<UserManagementDashboardProps> = ({ users, setUsers, currentUser, roles, currentUserPermissions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [tempPasswordInfo, setTempPasswordInfo] = useState<{ user: User, pass: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const canManage = currentUserPermissions.includes('MANAGE_USERS');

    const currentUserRoleName = useMemo(() => {
        if (!currentUser || !roles) return 'Unknown Role';
        return (roles ?? []).find(r => r._id === currentUser.roleId)?.name || 'Unknown Role';
    }, [currentUser, roles]);

    const usersWithRoles = useMemo(() => 
        users.map(user => ({
            ...user,
            roleName: (roles ?? []).find(r => r._id === user.roleId)?.name || 'Unknown Role'
        })),
    [users, roles]);

    const fuse = useMemo(() => new Fuse(usersWithRoles, {
        keys: ['name', 'email', 'roleName'],
        threshold: 0.3,
    }), [usersWithRoles]);

    const filteredUsers = useMemo(() => {
        if (!debouncedSearchTerm) {
            return usersWithRoles;
        }
        return fuse.search(debouncedSearchTerm).map(result => result.item);
    }, [debouncedSearchTerm, fuse, usersWithRoles]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = useMemo(() => {
        return filteredUsers.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredUsers, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleOpenAddModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleSaveUser = (userData: Omit<User, '_id'>, id: string | null) => {
        if (id) { // Editing
            setUsers(prev => prev.map(u => (u._id === id ? { ...userData, _id: id } : u)));
        } else { // Creating
            const newUser: User = { ...userData, _id: `U${Date.now()}` };
            setUsers(prev => [newUser, ...prev]);
        }
        setIsModalOpen(false);
    };

    const handleDeleteRequest = (user: User) => {
        if (user._id === currentUser?._id) {
            alert("You cannot delete your own account.");
            return;
        }
        setUserToDelete(user);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (userToDelete) {
            setUsers(prev => prev.filter(u => u._id !== userToDelete._id));
        }
        setIsConfirmOpen(false);
        setUserToDelete(null);
    };

    const handleResetPassword = (userToReset: User) => {
        const temporaryPassword = generateRandomPassword();
        setUsers(prev => prev.map(u => u._id === userToReset._id ? { ...u, passwordHash: temporaryPassword, passwordResetRequired: true, passwordResetRequested: false } : u));
        setTempPasswordInfo({ user: userToReset, pass: temporaryPassword });
    };

    const handleCopyPassword = () => {
        if (tempPasswordInfo) {
            navigator.clipboard.writeText(tempPasswordInfo.pass);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader className="p-4 border-b">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <CardTitle className="text-lg font-semibold tracking-tight">User Management</CardTitle>
                            <CardDescription>
                                Create, edit, and manage user accounts and their assigned roles.
                            </CardDescription>
                        </div>
                        {canManage && <Button onClick={handleOpenAddModal} size="sm">Add New User</Button>}
                    </div>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <Input
                            type="text"
                            placeholder="Search by Name, Email, or Role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-card-foreground">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-4 font-medium">User</th>
                                    <th className="p-4 font-medium">Role</th>
                                    <th className="p-4 font-medium">Status</th>
                                    {canManage && <th className="p-4 font-medium text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map(user => (
                                    <tr key={user._id} className="border-b hover:bg-accent">
                                        <td className="p-4 font-medium whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={user.name} photoUrl={user.photoUrl} className="w-10 h-10" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold">{user.name}</p>
                                                        <ConnectivityIndicator isOnline={user.isOnline ?? false} />
                                                        {user._id === currentUser?._id && <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded-full ml-2">You</span>}
                                                    </div>
                                                    <p className="text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className="font-medium text-primary">{user.roleName}</span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            {user.passwordResetRequested && (
                                                <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                                    Reset Requested
                                                </span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end space-x-2">
                                                    {user.passwordResetRequired ? (
                                                        <Button variant="outline" size="sm" disabled>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Reset Pending
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            variant={user.passwordResetRequested ? 'default' : 'secondary'}
                                                            size="sm" 
                                                            onClick={() => handleResetPassword(user)} 
                                                            disabled={user._id === currentUser?._id}
                                                            className={user.passwordResetRequested ? 'animate-pulse' : ''}
                                                        >
                                                            {user.passwordResetRequested && ( <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>)}
                                                            Reset Password
                                                        </Button>
                                                    )}
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(user)}>Edit</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(user)} disabled={user._id === currentUser?._id}>Delete</Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="p-6 text-center text-muted-foreground">
                                <p>No users found.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                 {totalPages > 1 && (
                  <CardFooter className="p-2 border-t justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                  </CardFooter>
                )}
            </Card>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveUser}
                initialData={editingUser}
                roles={roles}
            />

            <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete User: ${userToDelete?.name || ''}?`}
                description="This action cannot be undone. This will permanently delete the user and all associated data."
                confirmText="Delete"
                confirmVariant="destructive"
            />
            {tempPasswordInfo && (
                <ConfirmationDialog
                    isOpen={!!tempPasswordInfo}
                    onClose={() => setTempPasswordInfo(null)}
                    onConfirm={() => setTempPasswordInfo(null)}
                    title={`Password Reset for ${tempPasswordInfo.user.name}`}
                    description={
                        <div>
                            <p className="mb-2">The user's password has been reset. Please provide them with this temporary password:</p>
                            <div className="flex items-center justify-between p-2 my-4 bg-muted rounded-md border">
                                <span className="font-mono text-lg tracking-wider">{tempPasswordInfo.pass}</span>
                                <Button size="sm" variant="outline" onClick={handleCopyPassword}>
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">They will be required to change it on their next login.</p>
                        </div>
                    }
                    confirmText="Done"
                    cancelText={null}
                />
            )}
        </>
    );
};

export default UserManagementDashboard;
import React, { useState, useEffect } from 'react';
import type { User, Role } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Omit<User, '_id'>, id: string | null) => void;
  initialData: User | null;
  roles: Role[];
}

type UserFormErrors = Partial<Record<keyof Omit<User, '_id' | 'photoUrl'>, string>>;

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, initialData, roles }) => {
  const isEditMode = !!initialData;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<UserFormErrors>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (initialData) {
        setName(initialData.name);
        setEmail(initialData.email);
        setRoleId(initialData.roleId);
        setPhotoUrl(initialData.photoUrl || '');
        setPassword(''); // Don't expose existing password
      } else {
        setName('');
        setEmail('');
        setRoleId(roles[0]?._id || '');
        setPhotoUrl('');
        setPassword('');
      }
    }
  }, [isOpen, initialData, roles]);

  const validate = (): boolean => {
    const newErrors: UserFormErrors = {};
    if (!name.trim()) newErrors.name = "Name is required.";
    if (!email.trim()) {
        newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = "Email address is invalid.";
    }
    if (!roleId) newErrors.roleId = "Role is required.";
    
    if (!isEditMode && password.length < 8) {
        newErrors.passwordHash = "Password must be at least 8 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const userData = { 
        name, 
        email, 
        roleId, 
        photoUrl, 
        passwordHash: isEditMode && initialData ? initialData.passwordHash : password,
        passwordResetRequired: !isEditMode, // Force reset for new users
    };
    onSave(userData, initialData?._id || null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{isEditMode ? 'Edit User' : 'Add New User'}</h3>
            <p className="text-sm text-muted-foreground">Fill in the user details below.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium mb-1 block">Full Name</label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium mb-1 block">Email Address</label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>
             <div>
              <label htmlFor="photoUrl" className="text-sm font-medium mb-1 block">Photo URL (Optional)</label>
              <Input id="photoUrl" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://example.com/photo.jpg"/>
            </div>
            {!isEditMode && (
                <div>
                    <label htmlFor="password" className="text-sm font-medium mb-1 block">Initial Password</label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={isPasswordVisible ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="pr-10"
                        />
                         <button
                            type="button"
                            onClick={() => setIsPasswordVisible(prev => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                        >
                            {isPasswordVisible ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.057 9.542 7-1.274 4.057-5.03 7-9.542 7-4.478 0-8.268-2.943-9.543-7z" /></svg>
                            )}
                        </button>
                    </div>
                    {errors.passwordHash && <p className="text-sm text-destructive mt-1">{errors.passwordHash}</p>}
                    <p className="text-xs text-muted-foreground mt-1">User will be required to change this on first login.</p>
                </div>
            )}
            <div>
              <label htmlFor="role" className="text-sm font-medium mb-1 block">Role</label>
              <select
                id="role"
                value={roleId}
                onChange={e => setRoleId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {roles.map(r => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
               {errors.roleId && <p className="text-sm text-destructive mt-1">{errors.roleId}</p>}
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
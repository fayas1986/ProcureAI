import React, { useState, useRef } from 'react';
import type { User, Role } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Avatar } from './common/Avatar';

interface ProfilePageProps {
    currentUser: User;
    onUpdateProfile: (updatedUser: User) => void;
    roles: Role[];
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
};

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, onUpdateProfile, roles }) => {
    const [name, setName] = useState(currentUser.name);
    const [email, setEmail] = useState(currentUser.email);
    const [photoUrl, setPhotoUrl] = useState(currentUser.photoUrl);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const roleName = (roles ?? []).find(r => r._id === currentUser.roleId)?.name || 'Unknown Role';

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert("Image is too large. Please upload an image smaller than 2MB.");
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                alert("Invalid file type. Please upload a JPG, PNG, or WEBP image.");
                return;
            }
            const base64 = await fileToBase64(file);
            setPhotoUrl(base64);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedUser: User = {
            ...currentUser,
            name: name.trim() || currentUser.name,
            email: email.trim() || currentUser.email,
            photoUrl,
        };
        onUpdateProfile(updatedUser);
        alert('Profile updated successfully!');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-0">
                        <div className="relative h-64 bg-gradient-to-br from-slate-900 to-slate-800 rounded-t-lg">
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                                <div className="relative group">
                                    <Avatar name={name} photoUrl={photoUrl} className="w-40 h-40 ring-8 ring-background" />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/jpeg,image/png,image/webp" />
                                </div>
                            </div>
                        </div>
                        <div className="pt-24 px-6 pb-6 space-y-4">
                            <div className="text-center">
                                <h1 className="text-5xl font-bold tracking-tight">{name}</h1>
                                <p className="text-muted-foreground mt-1">{email}</p>
                                <p className="text-sm font-medium text-primary mt-2">{roleName}</p>
                            </div>
                            <div className="border-t pt-6 space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">Full Name</label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">Email Address</label>
                                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button type="submit">Save Changes</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ProfilePage;
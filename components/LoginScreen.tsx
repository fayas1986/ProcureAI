
import React, { useState, useEffect } from 'react';
import type { User, Role } from '../types';
import { Avatar } from './common/Avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { Input } from './common/Input';
import { Button } from './common/Button';

interface LoginScreenProps {
    users: User[];
    roles: Role[];
    onLogin: (email: string, password: string) => Promise<string | null>;
    onForgotPasswordRequest: (userId: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ users, roles, onLogin, onForgotPasswordRequest }) => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');

    const getRoleName = (roleId: string) => {
        return roles.find(r => r._id === roleId)?.name || 'Unknown Role';
    };

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setError('');
        setPassword('');
        setConfirmationMessage('');
    };

    const handleBack = () => {
        setSelectedUser(null);
        setConfirmationMessage('');
    };

    const handleLoginAttempt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !password) return;
        setIsLoading(true);
        setError('');
        const loginError = await onLogin(selectedUser.email, password);
        setIsLoading(false);
        if (loginError) {
            setError(loginError);
        }
    };

    const handleForgotPassword = () => {
        if (!selectedUser) return;
        onForgotPasswordRequest(selectedUser._id);
        setConfirmationMessage('Thanks for your effort. Your request has been submitted successfully. Please contact administrator.');
    };

    if (selectedUser) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                    <form onSubmit={handleLoginAttempt}>
                        <CardHeader className="text-center">
                            <Avatar name={selectedUser.name} photoUrl={selectedUser.photoUrl} className="w-24 h-24 mx-auto mb-4" />
                            <CardTitle>{selectedUser.name}</CardTitle>
                            <CardDescription>{selectedUser.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {confirmationMessage ? (
                                <div className="text-center p-4 bg-green-100/50 text-green-800 rounded-md border border-green-200">
                                    <p className="font-medium">{confirmationMessage}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label htmlFor="password-input" className="text-sm font-medium">Password</label>
                                        <div className="relative">
                                            <Input
                                                id="password-input"
                                                type={isPasswordVisible ? 'text' : 'password'}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                autoFocus
                                                required
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
                                    </div>
                                    <div className="text-right">
                                        <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={handleForgotPassword}>
                                            Forgot Password?
                                        </Button>
                                    </div>
                                    {error && <p className="text-sm text-center text-destructive">{error}</p>}
                                </>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                           {confirmationMessage ? (
                                <Button type="button" variant="link" onClick={handleBack} className="w-full">
                                    Return to Profiles
                                </Button>
                           ) : (
                                <>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? 'Signing In...' : 'Sign In'}
                                    </Button>
                                    <Button type="button" variant="link" onClick={handleBack} className="text-sm">
                                        Not you? Select a different profile.
                                    </Button>
                                </>
                           )}
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900">
            <div className="flex flex-col items-center justify-center mb-8 text-center">
                <div className="relative group">
                    {/* Animated gradient border */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 rounded-full blur-sm animate-gradient"></div>
                    
                    {/* Button content */}
                    <div className="relative px-12 py-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center gap-3 transition-all duration-300 group-hover:scale-105">
                      <span className="text-white text-3xl font-light tracking-wide">
                        Procure AI
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.5 21.75l-.398-1.188a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.188-.398a2.25 2.25 0 001.423-1.423L16.5 15.75l.398 1.188a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.188.398a2.25 2.25 0 00-1.423 1.423z"/>
                      </svg>
                    </div>
                </div>
                <p className="mt-4 text-xl font-light tracking-wider text-slate-400">AI-Driven Procurement Excellence</p>
            </div>
            
            <div className="w-full max-w-4xl">
                <h2 className="text-xl font-semibold text-center mb-6 text-slate-200">Select a user profile to log in</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {users.map(user => (
                        <div key={user._id} className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient"></div>
                            <button
                                onClick={() => handleUserSelect(user)}
                                className="relative w-full h-full text-center p-6 bg-slate-900 rounded-xl transition-all duration-200 transform group-hover:scale-105"
                            >
                                <Avatar name={user.name} photoUrl={user.photoUrl} className="w-16 h-16 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-100">{user.name}</h3>
                                <p className="text-sm text-slate-400">{getRoleName(user.roleId)}</p>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;

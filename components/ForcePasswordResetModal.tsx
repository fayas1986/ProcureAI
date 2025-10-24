import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface ForcePasswordResetModalProps {
    isOpen: boolean;
    onPasswordReset: (newPassword: string) => void;
}

const ForcePasswordResetModal: React.FC<ForcePasswordResetModalProps> = ({ isOpen, onPasswordReset }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        // Password policy checks
        const validationErrors: string[] = [];
        if (newPassword.length < 8) {
            validationErrors.push("be at least 8 characters long");
        }
        if (!/[A-Z]/.test(newPassword)) {
            validationErrors.push("contain at least one uppercase letter");
        }
        if (!/[a-z]/.test(newPassword)) {
            validationErrors.push("contain at least one lowercase letter");
        }
        if (!/[0-9]/.test(newPassword)) {
            validationErrors.push("contain at least one number");
        }
        if (!/[!@#$%^&*]/.test(newPassword)) {
            validationErrors.push("contain at least one special character (!@#$%^&*)");
        }

        if (validationErrors.length > 0) {
            setError(`Password must ${validationErrors.join(', ')}.`);
            return;
        }

        onPasswordReset(newPassword);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card className="w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Password Reset Required</CardTitle>
                        <CardDescription>An administrator has required you to reset your password. Please choose a new password to continue.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">New Password</label>
                            <div className="relative">
                                <Input
                                    type={isNewPasswordVisible ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsNewPasswordVisible(prev => !prev)}
                                    className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                                    aria-label={isNewPasswordVisible ? 'Hide new password' : 'Show new password'}
                                >
                                    {isNewPasswordVisible ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.057 9.542 7-1.274 4.057-5.03 7-9.542 7-4.478 0-8.268-2.943-9.543-7z" /></svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character (!@#$%^&*).
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
                            <div className="relative">
                                <Input
                                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmPasswordVisible(prev => !prev)}
                                    className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                                    aria-label={isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                                >
                                    {isConfirmPasswordVisible ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.057 9.542 7-1.274 4.057-5.03 7-9.542 7-4.478 0-8.268-2.943-9.543-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        {error && <p className="text-sm text-destructive text-center">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full">Set New Password</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ForcePasswordResetModal;
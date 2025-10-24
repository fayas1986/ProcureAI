import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface ResetPasswordWithTokenModalProps {
    token: string;
    onClose: () => void;
    onReset: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const ResetPasswordWithTokenModal: React.FC<ResetPasswordWithTokenModalProps> = ({ token, onClose, onReset }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setIsLoading(true);
        const result = await onReset(token, newPassword);
        setIsLoading(false);
        if (result.success) {
            setIsSuccess(true);
            setSuccessMessage(result.message);
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Reset Your Password</CardTitle>
                        <CardDescription>Enter and confirm your new password below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isSuccess ? (
                            <p className="text-sm text-green-600">{successMessage}</p>
                        ) : (
                            <>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">New Password</label>
                                    <div className="relative">
                                        <Input type={isNewPasswordVisible ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoFocus className="pr-10" />
                                        <button type="button" onClick={() => setIsNewPasswordVisible(p => !p)} className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.057 9.542 7-1.274 4.057-5.03 7-9.542 7-4.478 0-8.268-2.943-9.543-7z" /></svg></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
                                     <div className="relative">
                                        <Input type={isConfirmPasswordVisible ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="pr-10" />
                                        <button type="button" onClick={() => setIsConfirmPasswordVisible(p => !p)} className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.057 9.542 7-1.274 4.057-5.03 7-9.542 7-4.478 0-8.268-2.943-9.543-7z" /></svg></button>
                                    </div>
                                </div>
                            </>
                        )}
                        {error && <p className="text-sm text-destructive text-center">{error}</p>}
                    </CardContent>
                    <CardFooter>
                         {isSuccess ? (
                            <Button type="button" className="w-full" onClick={onClose}>Return to Login</Button>
                         ) : (
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Resetting...' : 'Set New Password'}
                            </Button>
                         )}
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ResetPasswordWithTokenModal;
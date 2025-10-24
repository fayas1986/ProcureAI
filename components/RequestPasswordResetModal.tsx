import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface RequestPasswordResetModalProps {
    onClose: () => void;
    onRequestReset: (email: string) => Promise<{ success: boolean; message: string }>;
    initialEmail?: string;
}

const RequestPasswordResetModal: React.FC<RequestPasswordResetModalProps> = ({ onClose, onRequestReset, initialEmail }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    
    useEffect(() => {
        setEmail(initialEmail || '');
        setMessage('');
        setIsSuccess(false);
    }, [initialEmail]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsSuccess(false);

        // Basic email format validation
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setMessage('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        const result = await onRequestReset(email);
        setIsLoading(false);
        setMessage(result.message);
        setIsSuccess(result.success);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
            <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Forgot Password</CardTitle>
                        <CardDescription>Enter your email address and we will send you a link to reset your password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isSuccess ? (
                            <p className="text-sm text-green-600">{message}</p>
                        ) : (
                            <div>
                                <label className="text-sm font-medium mb-1 block">Email Address</label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="you@example.com"
                                />
                            </div>
                        )}
                        {message && !isSuccess && <p className="text-sm text-destructive text-center">{message}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {isSuccess ? 'Close' : 'Cancel'}
                        </Button>
                        {!isSuccess && (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        )}
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default RequestPasswordResetModal;
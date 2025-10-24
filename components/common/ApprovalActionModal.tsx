import React, { useState } from 'react';
import { Button } from './Button';

interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comments: string) => void;
  action: 'Approve' | 'Reject';
}

const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({ isOpen, onClose, onSubmit, action }) => {
  const [comments, setComments] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(comments);
    setComments(''); // Reset for next use
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{action} Document</h3>
            <p className="text-sm text-muted-foreground">Please provide comments for your decision.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="comments" className="text-sm font-medium mb-1 block">Comments (Optional for approval, required for rejection)</label>
              <textarea
                id="comments"
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={`Enter your comments here...`}
                required={action === 'Reject'}
              />
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={action === 'Reject' ? 'destructive' : 'default'}>Submit {action}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalActionModal;
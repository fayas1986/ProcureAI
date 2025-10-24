import React from 'react';
import type { ApprovalWorkflow, User } from '../../types';
import { ApprovalStepStatus } from '../../types';

interface ApprovalWorkflowHistoryProps {
  workflow: ApprovalWorkflow[] | undefined;
  users: User[];
}

const ApprovalWorkflowHistory: React.FC<ApprovalWorkflowHistoryProps> = ({ workflow, users }) => {
  if (!workflow || workflow.length === 0) {
    return null;
  }

  const getUserName = (userId: string) => users.find(u => u._id === userId)?.name || 'Unknown User';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getStatusBadgeStyle = (status: ApprovalStepStatus) => {
      const colors = {
          [ApprovalStepStatus.Approved]: 'bg-green-100 text-green-800',
          [ApprovalStepStatus.Rejected]: 'bg-red-100 text-red-800'
      };
      return colors[status];
  };

  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Approval Workflow</h4>
      <div className="border rounded-lg p-4 space-y-4">
        {workflow.map((step, index) => (
          <div key={step._id} className="flex gap-4">
            <div className="flex flex-col items-center">
               <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                 {getUserName(step.approverId).charAt(0)}
               </div>
               {index < workflow.length - 1 && <div className="flex-grow w-px bg-border my-1"></div>}
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{getUserName(step.approverId)}</p>
                  <span className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeStyle(step.status)}`}>
                    {step.status}
                  </span>
               </div>
               <p className="text-xs text-muted-foreground">{formatDate(step.date)}</p>
               {step.comments && (
                 <p className="text-sm mt-1 bg-muted p-2 rounded-md italic">"{step.comments}"</p>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalWorkflowHistory;
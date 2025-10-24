import React from 'react';

interface ConnectivityIndicatorProps {
  isOnline: boolean;
}

const ConnectivityIndicator: React.FC<ConnectivityIndicatorProps> = ({ isOnline }) => {
  const statusText = isOnline ? 'Online' : 'Offline';
  const baseClasses = 'relative block h-3 w-3 rounded-full border-2 border-card';
  const statusClasses = isOnline ? 'bg-green-500' : 'bg-slate-400';

  return (
    <div title={statusText}>
      <span className={`${baseClasses} ${statusClasses}`} />
    </div>
  );
};

export default ConnectivityIndicator;
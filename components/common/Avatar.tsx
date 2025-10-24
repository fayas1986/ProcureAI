import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  photoUrl?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, className = 'w-10 h-10' }) => {
  const [error, setError] = useState(false);

  const getGeneratedAvatarUrl = () => {
    // ui-avatars.com generates nice-looking avatars from names
    const url = new URL('https://ui-avatars.com/api/');
    url.searchParams.append('name', name);
    url.searchParams.append('background', 'random'); // Get a random background color
    url.searchParams.append('color', 'fff'); // White text
    url.searchParams.append('size', '128'); // Request a decent resolution
    url.searchParams.append('bold', 'true');
    return url.toString();
  };
  
  const imageUrl = (!photoUrl || error) ? getGeneratedAvatarUrl() : photoUrl;

  return (
    <img
      src={imageUrl}
      alt={name}
      onError={() => setError(true)}
      className={`rounded-full object-cover flex-shrink-0 bg-muted ${className}`}
    />
  );
};

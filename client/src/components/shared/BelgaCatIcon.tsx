
import React from 'react';

interface BelgaCatIconProps {
  className?: string;
  size?: number;
}

export const BelgaCatIcon: React.FC<BelgaCatIconProps> = ({ 
  className = "w-5 h-5", 
  size 
}) => {
  return (
    <svg
      className={className}
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Belga Cat silhouette */}
      <path
        d="M12 2C8.5 2 6 4.5 6 8C6 8.5 6.1 9 6.2 9.4L5 10.5C4.5 11 4.5 11.8 5 12.3L6.5 13.8C7 14.3 7.8 14.3 8.3 13.8L9.4 12.7C10.2 13.5 11.1 14 12 14C12.9 14 13.8 13.5 14.6 12.7L15.7 13.8C16.2 14.3 17 14.3 17.5 13.8L19 12.3C19.5 11.8 19.5 11 19 10.5L17.8 9.4C17.9 9 18 8.5 18 8C18 4.5 15.5 2 12 2Z"
        fill="currentColor"
      />
      {/* Cat ears */}
      <path
        d="M9 3L8.5 6L10 5.5L9 3Z"
        fill="currentColor"
      />
      <path
        d="M15 3L16 5.5L14.5 6L15 3Z"
        fill="currentColor"
      />
      {/* Cat eyes */}
      <circle cx="10" cy="7" r="1" fill="white" />
      <circle cx="14" cy="7" r="1" fill="white" />
      {/* Cat nose */}
      <path
        d="M12 9L11.5 9.5L12.5 9.5L12 9Z"
        fill="white"
      />
      {/* Cat tail */}
      <path
        d="M12 14C12 16 11 18 10 20C9.5 21 10.5 22 12 21C14 20 15 18 15 16C15 15 14 14.5 13 14.2C12.7 14.1 12.3 14 12 14Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default BelgaCatIcon;

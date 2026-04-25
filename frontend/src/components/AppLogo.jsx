import React from 'react';
import { branding } from '../config/branding';

const AppLogo = ({ className = "text-3xl" }) => {
  // Using user requested highlight styling
  return (
    <div className={`flex items-center tracking-tighter ${className}`}>
      <span className={`text-yellow-400 font-black ${branding.logoGlowClass}`}>10</span>
      <span className="text-secondary font-black">Min</span>
    </div>
  );
};

export default AppLogo;

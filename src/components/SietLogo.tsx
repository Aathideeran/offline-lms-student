/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SietLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showMotto?: boolean;
}

export const SietLogo: React.FC<SietLogoProps> = ({ size = 'md', showMotto = false }) => {
  const dimensions =
    size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-20 h-20' : 'w-11 h-11';

  return (
    <div className="inline-flex flex-col items-center select-none">
      <div
        className={`${dimensions} rounded-full bg-white flex items-center justify-center shadow-xs overflow-hidden`}
      >
        <img
          src="/icon.svg"
          alt="Sri Shakthi Institute of Engineering and Technology Crest"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      {showMotto && (
        <div className="mt-0.5 text-[6.5px] leading-[7.5px] font-bold tracking-tight text-slate-800 uppercase text-center">
          <div>POWERING THE YOUTH</div>
          <div>EMPOWERING THE NATION</div>
        </div>
      )}
    </div>
  );
};

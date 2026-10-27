/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CourseBannerProps {
  pattern: 'pixel_gray' | 'waves_blue' | 'poly_teal';
}

export const CourseBanner: React.FC<CourseBannerProps> = ({ pattern }) => {
  if (pattern === 'pixel_gray') {
    // 8x4 mosaic grid matching Screenshot 2's "2029 Semester Exams" card
    const shades = [
      '#b8babc', '#c4c6c8', '#aeb0b2', '#cfd1d3', '#b8babc', '#a3a5a7', '#c8cacb', '#b4b6b8',
      '#d0d2d4', '#dcdedf', '#c2c4c6', '#e2e4e5', '#d0d2d4', '#b8babc', '#d8dadb', '#c4c6c8',
      '#c2c4c6', '#cfd1d3', '#b4b6b8', '#d8dadb', '#c4c6c8', '#aeb0b2', '#cfd1d3', '#bcbec0',
      '#dcdedf', '#e6e7e8', '#cfd1d3', '#eceeef', '#dcdedf', '#c8cacb', '#e2e4e5', '#d0d2d4',
    ];
    return (
      <svg
        viewBox="0 0 320 120"
        className="w-full h-full object-cover"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {shades.map((fill, idx) => {
          const col = idx % 8;
          const row = Math.floor(idx / 8);
          return (
            <rect
              key={idx}
              x={col * 40}
              y={row * 30}
              width={40.5}
              height={30.5}
              fill={fill}
            />
          );
        })}
      </svg>
    );
  }

  if (pattern === 'waves_blue') {
    // Concentric curved blue waves matching Screenshot 2's "2029 Database Management Sy..." card
    return (
      <svg
        viewBox="0 0 320 120"
        className="w-full h-full object-cover"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect width="320" height="120" fill="#5da2f5" />
        <path
          d="M0 0 L110 0 Q150 60 95 120 L0 120 Z"
          fill="#69aaf7"
        />
        <path
          d="M65 0 L245 0 Q215 60 250 120 L80 120 Q125 60 65 0 Z"
          fill="#7db6f9"
        />
        <path
          d="M115 0 L205 0 Q180 60 210 120 L125 120 Q155 60 115 0 Z"
          fill="#8cc0fa"
        />
      </svg>
    );
  }

  // 'poly_teal' — Geometric polygonal teal/mint facets matching Screenshot 2's "2029 -25ENH311 -CEP-I" card
  return (
    <svg
      viewBox="0 0 320 120"
      className="w-full h-full object-cover"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect width="320" height="120" fill="#70ded9" />
      <polygon points="0,0 95,0 60,65 0,45" fill="#63d6d1" />
      <polygon points="95,0 225,0 255,55 190,110 115,110 60,65" fill="#7ce5e0" />
      <polygon points="225,0 320,0 320,50 255,55" fill="#68dbd6" />
      <polygon points="0,45 60,65 115,110 0,120" fill="#85e9e4" />
      <polygon points="255,55 320,50 320,120 190,110" fill="#92ede9" />
      <polygon points="115,110 190,110 320,120 0,120" fill="#75e0db" />
    </svg>
  );
};

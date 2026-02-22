'use client'

import React from 'react'

export function TestGridBackground({
  gridColor = 'rgba(0, 217, 255, 0.4)',
  bgColor = '#020205',
  speed = '1.5s'
}: {
  gridColor?: string
  bgColor?: string
  speed?: string
}) {
  return (
    <div 
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none perspective-container"
      style={{ backgroundColor: bgColor }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-container {
          perspective: 800px;
          perspective-origin: center center;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .grid-plane {
          position: absolute;
          width: 400vmax;
          height: 400vmax;
          left: -150vmax;
          top: -150vmax;
          background-image: 
            linear-gradient(${gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px);
          background-size: 80px 80px;
          background-position: center center;
          /* Improve rendering performance */
          will-change: transform, background-position;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        /* The 4 walls of the tunnel */
        .grid-bottom { transform: translateY(40vh) rotateX(90deg);   animation: move-y ${speed} linear infinite; }
        .grid-top    { transform: translateY(-40vh) rotateX(-90deg); animation: move-y-rev ${speed} linear infinite; }
        .grid-left   { transform: translateX(-40vw) rotateY(90deg);  animation: move-x-rev ${speed} linear infinite; }
        .grid-right  { transform: translateX(40vw) rotateY(-90deg);  animation: move-x ${speed} linear infinite; }

        @keyframes move-y {
          0% { background-position: 0px 0px; }
          100% { background-position: 0px 80px; }
        }
        @keyframes move-y-rev {
          0% { background-position: 0px 0px; }
          100% { background-position: 0px -80px; }
        }
        @keyframes move-x {
          0% { background-position: 0px 0px; }
          100% { background-position: 80px 0px; }
        }
        @keyframes move-x-rev {
          0% { background-position: 0px 0px; }
          100% { background-position: -80px 0px; }
        }

        /* Fog effect for infinity depth */
        .fog-overlay {
          position: absolute;
          inset: -20%; /* Cover past edges just in case */
          background: radial-gradient(circle at center, transparent 10%, ${bgColor} 65%);
          z-index: 10;
        }
        
        /* Subtle center glow */
        .glow-overlay {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, rgba(0, 217, 255, 0.08) 0%, transparent 60%);
            z-index: 11;
        }
      `}} />

      {/* The 3D rotating planes */}
      <div className="grid-plane grid-bottom" />
      <div className="grid-plane grid-top" />
      <div className="grid-plane grid-left" />
      <div className="grid-plane grid-right" />
      
      {/* Overlays to create fading/depth */}
      <div className="glow-overlay" />
      <div className="fog-overlay" />
    </div>
  )
}

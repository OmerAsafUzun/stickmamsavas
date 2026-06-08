/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface HatGraphicProps {
  id: string;
  className?: string;
  size?: number;
}

export function HatGraphic({ id, className = "", size = 48 }: HatGraphicProps) {
  // SVG drawing based on costume ID
  switch (id) {
    case "crown":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))" }}
        >
          {/* Base crown structure */}
          <path d="M2 4l3 12h14l3-12-5 5-5-5-5 5-5-5z" fill="rgba(251, 191, 36, 0.2)" />
          {/* Royal cape suggestion line */}
          <path d="M5 16s1 4-2 6M19 16s-1 4 2 6" stroke="#ef4444" strokeWidth="1.5" />
          {/* Peak jewels */}
          <circle cx="2" cy="4" r="1" fill="#fbbf24" />
          <circle cx="12" cy="4" r="1" fill="#fbbf24" />
          <circle cx="22" cy="4" r="1" fill="#fbbf24" />
        </svg>
      );

    case "cowboy":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(249, 115, 22, 0.6))" }}
        >
          {/* Sheriff cowboy wide brim hat */}
          <path d="M3 14c4 1 14 1 18 0l-2-3s-1-4-7-4-7 4-7 4l-2 3z" fill="rgba(249, 115, 22, 0.2)" />
          <path d="M2 14c5 2 15 2 20 0" />
          {/* Shining gold sheriff badge */}
          <path d="M12 11l1 2 2.5.5-2 1.8.5 2.5-2-1.3-2 1.3.5-2.5-2-1.8 2.5-.5z" stroke="#fbbf24" fill="#fbbf24" transform="scale(0.6) translate(8, 11)" />
        </svg>
      );

    case "ninja":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(244, 63, 94, 0.6))" }}
        >
          {/* Ninja headwrap with visible neon eyes slit */}
          <circle cx="12" cy="12" r="9" fill="rgba(244, 63, 94, 0.15)" />
          {/* Mask wrap lines */}
          <path d="M4 11h16M3 14h18" stroke="#f43f5e" />
          {/* Determined eyes slit glow */}
          <path d="M9 9.5l1.5.5M15 9.5l-1.5.5" stroke="#ffffff" strokeWidth="2" />
          {/* Knot ribbons flying behind */}
          <path d="M3 13c-2 0-3 3-3 6M3 13c-1-2-3-1-3 2" />
        </svg>
      );

    case "spartan":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#eab308"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(234, 179, 8, 0.6))" }}
        >
          {/* Spartan face helmet outline */}
          <path d="M12 2c5 0 9 4 9 9v4l-3-1-1-3h-10l-1 3-3 1v-4c0-5 4-9 9-9z" fill="rgba(234, 179, 8, 0.15)" />
          {/* Nose-bridge and eye slits */}
          <path d="M12 9v5m-4.5-2.5l5.5 1 5.5-1" />
          <path d="M12 14.5l-3 4.5h6z" fill="rgba(234, 179, 8, 0.3)" />
          {/* Red Crest / Plume */}
          <path d="M12 2C8-1 4 0 4 0s4 3 8 2" stroke="#ef4444" strokeWidth="3" />
        </svg>
      );

    case "wizard":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a855f7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))" }}
        >
          {/* Pointy wizard hat with brim */}
          <path d="M3 16l1-1 8-12 5 11 3 2H3z" fill="rgba(168, 85, 247, 0.2)" />
          <path d="M1 17c5 1.5 17 1.5 22 0" />
          {/* Hanging magic star */}
          <path d="M12 7.5L13 9l1.5-.5-1 1.2.7 1.5-1.4-.7-1.4.7.7-1.5-1-1.2 1.5.5z" stroke="#fbbf24" fill="#fbbf24" transform="scale(0.7) translate(8.5, 4)" />
        </svg>
      );

    case "astronaut":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(14, 165, 233, 0.6))" }}
        >
          {/* Sphere oxygen space helmet */}
          <circle cx="12" cy="12" r="9" fill="rgba(14, 165, 233, 0.15)" />
          {/* Glowing visor */}
          <path d="M6 11c0-3 2.5-5 6-5s6 2 6 5-2.5 5-6 5-6-2-6-5z" fill="rgba(255,255,255,0.1)" stroke="#ffffff" strokeWidth="1.5" />
          {/* Visor shine flare accent */}
          <path d="M15 8.5c1 .5 1.5 1.5 1.5 2" stroke="#ffffff" strokeWidth="1" />
        </svg>
      );

    case "chef":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))" }}
        >
          {/* Gourmet puffy chef hat outline */}
          <path d="M5 16h14v-3c0-1.5-.5-2.5-2-3 .5-1.5-.5-3.5-2.5-4C13 4 11 4 9.5 6 7.5 5.5 6.5 7.5 7 9c-1.5.5-2 1.5-2 3v3z" fill="rgba(255, 255, 255, 0.15)" />
          <path d="M4 17h16" />
          {/* Crossed Spoon and Fork culinary seal */}
          <path d="M10 12l4 4M14 12l-4 4" stroke="#e4e4e7" strokeWidth="1" />
        </svg>
      );

    default:
      // Standard cool cyberpunk head portrait badge (none / plain)
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 4px rgba(148, 163, 184, 0.4))" }}
        >
          {/* Round neon face with a crosshair target or modern face seal */}
          <circle cx="12" cy="12" r="8" fill="rgba(148, 163, 184, 0.15)" strokeWidth="2.5" />
          {/* Minimalist eye lines */}
          <circle cx="9" cy="10" r="1.2" fill="#94a3b8" />
          <circle cx="15" cy="10" r="1.2" fill="#94a3b8" />
          {/* Confident mouth groove */}
          <path d="M8.5 14h7" strokeWidth="2" />
        </svg>
      );
  }
}

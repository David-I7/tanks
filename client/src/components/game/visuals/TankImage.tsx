import React from "react";

export type TankImageProps = {
  tankId: string;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
};

export const TankImage: React.FC<TankImageProps> = ({
  tankId,
  size = 64,
  width,
  height,
  className = "",
  style,
}) => {
  const w = width ?? size;
  const h = height ?? Math.round((size * 48) / 64);
  const normalizedId = tankId.toLowerCase();

  switch (normalizedId) {
    case "ignis":
      return (
        <svg
          viewBox="0 0 64 48"
          width={w}
          height={h}
          className={`shrink-0 ${className}`}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dual Exhaust Stacks with Flames */}
          <g>
            <rect x="8" y="10" width="5" height="10" rx="1.5" fill="#1e293b" stroke="#71717a" strokeWidth="1" transform="rotate(-15 8 10)" />
            <path d="M7 6 C6 3 9 1 10 4 C11 2 13 4 11 8 Z" fill="#f97316" />
            <path d="M8 6 C8 4 10 3 10 6 Z" fill="#facc15" />
          </g>

          {/* Cannon Barrel */}
          <rect x="28" y="18" width="28" height="6" rx="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
          <rect x="36" y="20" width="16" height="2" rx="1" fill="#facc15" />
          <circle cx="56" cy="21" r="3.5" fill="#ffffff" stroke="#facc15" strokeWidth="1" />

          {/* Turret Dome */}
          <path d="M22 17 C22 13 28 12 36 12 C44 12 48 15 48 19 L20 19 Z" fill="#b91c1c" stroke="#f87171" strokeWidth="1.2" />

          {/* Main Chassis Body */}
          <rect x="10" y="19" width="44" height="14" rx="4" fill="url(#ignisBodyGrad)" stroke="#f87171" strokeWidth="1.5" />

          {/* Heat Vents */}
          <line x1="16" y1="24" x2="24" y2="24" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="28" y1="24" x2="38" y2="24" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="42" y1="24" x2="48" y2="24" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />

          {/* Heavy Tracks */}
          <rect x="6" y="32" width="52" height="12" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          {/* Wheels / Rollers */}
          {[-16, -8, 0, 8, 16].map((offset, i) => (
            <g key={i} transform={`translate(${32 + offset}, 38)`}>
              <circle r="4" fill="#1e293b" stroke="#ef4444" strokeWidth="1.2" />
              <circle r="1.5" fill="#facc15" />
            </g>
          ))}

          <defs>
            <linearGradient id="ignisBodyGrad" x1="0" y1="19" x2="0" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "glacies":
      return (
        <svg
          viewBox="0 0 64 48"
          width={w}
          height={h}
          className={`shrink-0 ${className}`}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Swept Dorsal Ice Fin */}
          <path d="M12 20 L6 10 L20 18 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />

          {/* Cryo Lance Cannon */}
          <rect x="28" y="19" width="30" height="4" rx="2" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
          {/* Frost Rings */}
          <ellipse cx="36" cy="21" rx="2" ry="4" fill="none" stroke="#e0f2fe" strokeWidth="1.5" />
          <ellipse cx="45" cy="21" rx="2" ry="4" fill="none" stroke="#e0f2fe" strokeWidth="1.5" />
          <circle cx="58" cy="21" r="3" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />

          {/* Crystalline Turret */}
          <path d="M22 17 L30 11 L42 13 L46 19 L20 19 Z" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.2" />

          {/* Crystalline Faceted Chassis */}
          <path d="M12 20 L24 16 L48 17 L54 24 L50 33 L10 33 L8 24 Z" fill="url(#glaciesBodyGrad)" stroke="#7dd3fc" strokeWidth="1.5" />

          {/* Frost Facet Accent Lines */}
          <line x1="24" y1="16" x2="32" y2="33" stroke="#e0f2fe" strokeWidth="1.2" strokeOpacity="0.8" />
          <line x1="48" y1="17" x2="42" y2="33" stroke="#e0f2fe" strokeWidth="1.2" strokeOpacity="0.8" />

          {/* Cryo Tracks */}
          <rect x="6" y="33" width="52" height="11" rx="3.5" fill="#082f49" stroke="#0284c7" strokeWidth="1.5" />
          {/* Ice Rollers */}
          {[-16, -8, 0, 8, 16].map((offset, i) => (
            <g key={i} transform={`translate(${32 + offset}, 38.5)`}>
              <circle r="3.8" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
              <circle r="1.5" fill="#e0f2fe" />
            </g>
          ))}

          <defs>
            <linearGradient id="glaciesBodyGrad" x1="0" y1="16" x2="0" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "terra":
      return (
        <svg
          viewBox="0 0 64 48"
          width={w}
          height={h}
          className={`shrink-0 ${className}`}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rear Hydraulic Recoil Damper */}
          <rect x="6" y="14" width="7" height="9" rx="1.5" fill="#451a03" stroke="#78350f" strokeWidth="1.2" />
          <line x1="9" y1="16" x2="9" y2="21" stroke="#fde68a" strokeWidth="1.5" />

          {/* Heavy Earth Cannon */}
          <rect x="28" y="17" width="26" height="7" rx="2" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
          <rect x="46" y="16" width="6" height="9" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="1" />

          {/* Heavy Turret Bunker */}
          <rect x="20" y="12" width="22" height="9" rx="2" fill="#92400e" stroke="#fde68a" strokeWidth="1.2" />

          {/* Armored Chassis Body */}
          <rect x="10" y="20" width="42" height="13" rx="2.5" fill="url(#terraBodyGrad)" stroke="#78350f" strokeWidth="1.5" />

          {/* Bulldozer Front Plow with Hazard Stripes */}
          <path d="M50 20 L58 26 L54 36 L48 34 Z" fill="#d97706" stroke="#451a03" strokeWidth="1.2" />
          <line x1="51" y1="23" x2="55" y2="28" stroke="#18181b" strokeWidth="1.8" />
          <line x1="52" y1="28" x2="56" y2="33" stroke="#18181b" strokeWidth="1.8" />

          {/* Heavy Industrial Tracks */}
          <rect x="4" y="33" width="54" height="12" rx="3" fill="#18181b" stroke="#78350f" strokeWidth="1.5" />
          {/* Iron Wheel Sprockets */}
          {[-18, -9, 0, 9, 18].map((offset, i) => (
            <g key={i} transform={`translate(${31 + offset}, 39)`}>
              <circle r="4" fill="#292524" stroke="#d97706" strokeWidth="1.2" />
              <circle r="1.5" fill="#fde68a" />
            </g>
          ))}

          <defs>
            <linearGradient id="terraBodyGrad" x1="0" y1="20" x2="0" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "volt":
    default:
      return (
        <svg
          viewBox="0 0 64 48"
          width={w}
          height={h}
          className={`shrink-0 ${className}`}
          style={style}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Twin Railgun Prongs with Tesla Coils */}
          <rect x="28" y="16" width="28" height="3" rx="1.5" fill="#581c87" stroke="#a855f7" strokeWidth="1" />
          <rect x="28" y="22" width="28" height="3" rx="1.5" fill="#581c87" stroke="#a855f7" strokeWidth="1" />
          {/* Glowing Rail Arc Beam */}
          <line x1="32" y1="20.5" x2="54" y2="20.5" stroke="#06b6d4" strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="56" cy="20.5" r="3" fill="#06b6d4" />

          {/* Futuristic Rounded Turret */}
          <ellipse cx="28" cy="18" rx="12" ry="6" fill="#6b21a8" stroke="#c084fc" strokeWidth="1.2" />

          {/* Central Plasma Arc Reactor Core */}
          <circle cx="28" cy="18" r="3.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />

          {/* Sleek Electromagnetic Hull */}
          <path d="M10 24 Q30 18 50 24 L48 33 L12 33 Z" fill="url(#voltBodyGrad)" stroke="#a855f7" strokeWidth="1.5" />

          {/* Circuit / Arc Accent Lines */}
          <path d="M16 28 L24 28 L28 25 L38 25" fill="none" stroke="#06b6d4" strokeWidth="1.2" strokeLinecap="round" />

          {/* Electromagnetic Hover Base / Thruster Grid */}
          <rect x="6" y="33" width="52" height="10" rx="3.5" fill="#1e1b4b" stroke="#581c87" strokeWidth="1.5" />
          {/* Pulsing Arc Coils */}
          {[-16, -8, 0, 8, 16].map((offset, i) => (
            <g key={i} transform={`translate(${32 + offset}, 38)`}>
              <circle r="3.5" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
              <circle r="1.5" fill="#06b6d4" />
            </g>
          ))}

          <defs>
            <linearGradient id="voltBodyGrad" x1="0" y1="20" x2="0" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
          </defs>
        </svg>
      );
  }
};

export default TankImage;

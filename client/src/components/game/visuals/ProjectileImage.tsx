import React from "react";

export type ProjectileImageProps = {
  projectileId: string;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
};

export const ProjectileImage: React.FC<ProjectileImageProps> = ({
  projectileId,
  size = 36,
  width,
  height,
  className = "",
  style,
}) => {
  const w = width ?? size;
  const h = height ?? size;

  switch (projectileId) {
    // 1. Standard Kaboom (Universal)
    case "standardKaboom":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M8 18 L16 12 L26 12 L28 18 L26 24 L16 24 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="19" cy="18" r="4.5" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" />
          <path d="M4 18 L8 14 L8 22 Z" fill="#38bdf8" opacity="0.8" />
        </svg>
      );

    // 2. Ignis - Dragon's Breath (Damage Trail)
    case "dragonsBreath":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#450a0a" stroke="#f97316" strokeWidth="1.5" />
          <path d="M6 18 C12 10 22 8 28 14 C30 18 26 26 18 27 C10 28 6 22 6 18 Z" fill="url(#dbGrad)" />
          <path d="M10 18 C14 13 22 12 24 16 C26 18 22 22 17 22 C12 22 10 20 10 18 Z" fill="#ffffff" />
          <defs>
            <linearGradient id="dbGrad" x1="6" y1="18" x2="28" y2="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
          </defs>
        </svg>
      );

    // 3. Ignis - Magma Salvo (Burst)
    case "magmaSalvo":
    case "magmaMortar":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="11" fill="url(#mmGrad)" stroke="#f97316" strokeWidth="1.2" />
          <path d="M12 15 Q18 10 24 16 Q20 22 14 20" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
          <defs>
            <radialGradient id="mmGrad" cx="0.4" cy="0.4" r="0.6">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
          </defs>
        </svg>
      );

    // 4. Ignis - Blaze Cluster (Split at vy = 0)
    case "blazeCluster":
    case "blazeCluster_shard":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#3b0707" stroke="#f97316" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="7" fill="#f97316" stroke="#facc15" strokeWidth="1.2" />
          <circle cx="11" cy="13" r="3" fill="#ef4444" />
          <circle cx="25" cy="13" r="3" fill="#ef4444" />
          <circle cx="12" cy="23" r="3" fill="#facc15" />
          <circle cx="24" cy="23" r="3" fill="#facc15" />
          <circle cx="18" cy="18" r="2.5" fill="#ffffff" />
        </svg>
      );

    // 5. Ignis - Lava Hopper (Special Bouncer)
    case "lavaHopper":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#2a0808" stroke="#facc15" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="12" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="18" cy="18" r="8" fill="#f97316" stroke="#facc15" strokeWidth="1.5" />
          <path d="M12 26 C15 22 21 22 24 26" fill="none" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="18" cy="18" r="3.5" fill="#fef08a" />
        </svg>
      );

    // Ignis - Pyroclast Cataclysm (legacy)
    case "pyroclastCataclysm":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#1c0404" stroke="#ef4444" strokeWidth="2" />
          <circle cx="18" cy="18" r="13" fill="#7f1d1d" stroke="#f97316" strokeWidth="1.2" />
          <path d="M9 18 L15 13 L22 17 L27 12 L24 22 L17 20 L13 25 Z" fill="#f97316" stroke="#fef08a" strokeWidth="1.2" />
          <circle cx="18" cy="18" r="4.5" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
        </svg>
      );

    // 6. Glacies - Frostbite Zone (Damage Trail)
    case "frostbiteZone":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#082f49" stroke="#0ea5e9" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="11" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" />
          <path d="M18 8 L18 28 M8 18 L28 18 M11 11 L25 25 M25 11 L11 25" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="18" cy="18" r="2.5" fill="#ffffff" />
        </svg>
      );

    // 7. Glacies - Blizzard Salvo (Burst)
    case "blizzardSalvo":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#082f49" stroke="#38bdf8" strokeWidth="1.5" />
          <g transform="translate(0, -6)">
            <line x1="8" y1="14" x2="28" y2="14" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g transform="translate(0, 0)">
            <line x1="10" y1="18" x2="26" y2="18" stroke="#e0f2fe" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g transform="translate(0, 6)">
            <line x1="8" y1="22" x2="28" y2="22" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          </g>
          <circle cx="24" cy="18" r="2" fill="#ffffff" />
        </svg>
      );

    // 8. Glacies - Apex Avalanche (Split at vy = 0)
    case "apexAvalanche":
    case "apexAvalanche_shard":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#0c4a6e" stroke="#7dd3fc" strokeWidth="1.5" />
          <path d="M18 6 L22 14 L30 18 L22 22 L18 30 L14 22 L6 18 L14 14 Z" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.2" />
          <circle cx="18" cy="18" r="3.5" fill="#ffffff" />
        </svg>
      );

    // 9. Glacies - Cryo Needle (Special Drill)
    case "cryoNeedle":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#082f49" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M6 18 L26 12 L30 18 L26 24 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
          <path d="M14 18 L28 15 L28 21 Z" fill="#e0f2fe" />
          <line x1="10" y1="18" x2="28" y2="18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // Glacies - Glacial Shatter (legacy)
    case "glacialShatter":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#082f49" stroke="#38bdf8" strokeWidth="1.8" />
          <path d="M10 14 L18 8 L26 14 L28 22 L20 28 L10 24 Z" fill="url(#gsGrad)" stroke="#bae6fd" strokeWidth="1.2" />
          <line x1="18" y1="8" x2="20" y2="28" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="10" y1="14" x2="28" y2="22" stroke="#ffffff" strokeWidth="1.2" />
          <defs>
            <linearGradient id="gsGrad" x1="10" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
        </svg>
      );

    // 10. Terra - Quake Fissure (Damage Trail)
    case "quakeFissure":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#241108" stroke="#d97706" strokeWidth="1.5" />
          <path d="M18 6 L15 13 L22 18 L14 23 L20 28 L18 31" fill="none" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="15" cy="13" r="2" fill="#f97316" />
          <circle cx="22" cy="18" r="2.5" fill="#ef4444" />
          <circle cx="14" cy="23" r="2" fill="#f97316" />
        </svg>
      );

    // 11. Terra - Gravel Gatling (Burst)
    case "gravelGatling":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#291508" stroke="#d97706" strokeWidth="1.5" />
          <g transform="translate(0, -6)">
            <rect x="10" y="15" width="16" height="4" rx="2" fill="#78350f" stroke="#fde68a" strokeWidth="0.8" />
          </g>
          <g transform="translate(0, 0)">
            <rect x="12" y="16" width="16" height="4" rx="2" fill="#d97706" stroke="#fde68a" strokeWidth="0.8" />
          </g>
          <g transform="translate(0, 6)">
            <rect x="10" y="17" width="16" height="4" rx="2" fill="#78350f" stroke="#fde68a" strokeWidth="0.8" />
          </g>
        </svg>
      );

    // 12. Terra - Granite Cluster (Split at vy = 0)
    case "graniteCluster":
    case "graniteCluster_shard":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#27150a" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="5" fill="#78350f" stroke="#fde68a" strokeWidth="1" />
          <circle cx="23" cy="14" r="4" fill="#b45309" stroke="#fde68a" strokeWidth="1" />
          <circle cx="15" cy="23" r="4" fill="#b45309" stroke="#fde68a" strokeWidth="1" />
          <circle cx="23" cy="22" r="5" fill="#78350f" stroke="#fde68a" strokeWidth="1" />
        </svg>
      );

    // 13. Terra - Tectonic Thumper (Special Seismic)
    case "tectonicThumper":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#27150a" stroke="#78350f" strokeWidth="1.5" />
          <rect x="12" y="9" width="12" height="18" rx="2.5" fill="#b45309" stroke="#fde68a" strokeWidth="1.2" />
          <line x1="12" y1="15" x2="24" y2="15" stroke="#451a03" strokeWidth="1.5" />
          <line x1="12" y1="21" x2="24" y2="21" stroke="#451a03" strokeWidth="1.5" />
          <path d="M7 29 Q18 24 29 29" fill="none" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // Terra - Sinkhole Drill (legacy)
    case "sinkholeDrill":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#1c0c05" stroke="#d97706" strokeWidth="1.5" />
          <path d="M12 9 L24 9 L21 16 L23 19 L19 24 L18 29 L17 24 L13 19 L15 16 Z" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
          <line x1="14" y1="13" x2="22" y2="13" stroke="#d97706" strokeWidth="1.2" />
          <line x1="15" y1="18" x2="21" y2="18" stroke="#d97706" strokeWidth="1.2" />
          <circle cx="18" cy="28" r="2" fill="#fbbf24" />
        </svg>
      );

    // 14. Volt - Tesla Grid (Damage Trail)
    case "teslaGrid":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#180b29" stroke="#a855f7" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="10" fill="#581c87" stroke="#06b6d4" strokeWidth="1.2" />
          <line x1="8" y1="18" x2="28" y2="18" stroke="#22d3ee" strokeWidth="1" />
          <line x1="18" y1="8" x2="18" y2="28" stroke="#22d3ee" strokeWidth="1" />
          <circle cx="18" cy="18" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
        </svg>
      );

    // 15. Volt - Arc Salvo (Burst)
    case "arcSalvo":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#1e1035" stroke="#a855f7" strokeWidth="1.5" />
          <path d="M8 12 L16 12 L14 16 L22 16 L18 24 L28 24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#a855f7" stroke="#06b6d4" strokeWidth="1" />
          <circle cx="18" cy="18" r="3" fill="#a855f7" stroke="#06b6d4" strokeWidth="1" />
          <circle cx="24" cy="24" r="3" fill="#a855f7" stroke="#06b6d4" strokeWidth="1" />
        </svg>
      );

    // 16. Volt - Static Apex Star (Split at vy = 0)
    case "staticApexStar":
    case "staticApexStar_shard":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#240e3b" stroke="#c084fc" strokeWidth="1.5" />
          <path d="M18 6 L20 14 L28 12 L22 18 L28 24 L20 22 L18 30 L16 22 L8 24 L14 18 L8 12 L16 14 Z" fill="#a855f7" stroke="#22d3ee" strokeWidth="1.2" />
          <circle cx="18" cy="18" r="3" fill="#ffffff" />
        </svg>
      );

    // 17. Volt - Thunderstrike Core (Special Railgun)
    case "thunderstrikeCore":
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#140724" stroke="#06b6d4" strokeWidth="1.8" />
          <line x1="4" y1="18" x2="32" y2="18" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="10" y1="18" x2="26" y2="18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="20" cy="18" rx="4" ry="7" fill="none" stroke="#a855f7" strokeWidth="1.2" />
          <circle cx="28" cy="18" r="3.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="1" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 36 36" width={w} height={h} className={className} style={style} fill="none">
          <circle cx="18" cy="18" r="16" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="6" fill="#94a3b8" />
        </svg>
      );
  }
};

export default ProjectileImage;

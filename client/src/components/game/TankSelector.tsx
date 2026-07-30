import { useState } from "react";
import { useAssetQuery, type TankAsset } from "../../hooks/useAssetQuery";
import { useAssetStore } from "../../store/useAssetStore";

type TankSelectorProps = {
  onTankSelect?: (tank: TankAsset) => void;
  label?: string;
};

const TANK_DEFAULT_COLORS: Record<string, string> = {
  "heavy-armor": "#ef4444",
  "desert-striker": "#eab308",
  "vanguard-cyber": "#06b6d4",
  specter: "#a855f7",
};

export default function TankSelector({
  onTankSelect,
  label = "Select Your Tank",
}: TankSelectorProps) {
  const { data: tanks, isLoading } = useAssetQuery();
  const selectedTankId = useAssetStore((state) => state.selectedTankId);
  const selectTank = useAssetStore((state) => state.setSelectedTank);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  if (isLoading || !tanks) {
    return <div className="text-xs text-text-body-muted">Loading tanks...</div>;
  }

  const selectedTank = tanks.find((t) => t.id === selectedTankId) || null;

  return (
    <div className="flex flex-col gap-3 w-full text-left">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-text-body-muted">
          {label}
        </label>
      )}

      {/* Tank Cards Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tanks.map((tank) => {
          const isSelected = tank.id === selectedTankId;
          const tankColor = (tank as any).color || TANK_DEFAULT_COLORS[tank.id] || "#a855f7";
          const imageFailed = failedImages[tank.id];

          return (
            <button
              key={tank.id}
              type="button"
              onClick={() => {
                selectTank(tank.id);
                onTankSelect && onTankSelect(tank);
              }}
              className={`flex flex-col items-center p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/40"
                  : "border-border-main bg-background-high hover:border-text-body-muted"
              }`}
            >
              <div className="w-16 h-12 flex items-center justify-center overflow-hidden relative">
                {tank.image && !imageFailed ? (
                  <img
                    src={tank.url}
                    alt={tank.name}
                    className="w-full h-full object-contain"
                    onError={() => setFailedImages((prev) => ({ ...prev, [tank.id]: true }))}
                  />
                ) : (
                  <div
                    className="w-12 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-inner border border-white/20"
                    style={{ backgroundColor: tankColor }}
                  >
                    {tank.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span
                className={`text-xs font-medium mt-1 truncate w-full text-center ${
                  isSelected ? "text-primary font-bold" : "text-text-body-high"
                }`}
              >
                {tank.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Tank Arsenal & Projectile Asset Display */}
      {selectedTank && (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border-main bg-background/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary">
              {selectedTank.name} Arsenal
            </span>
            <span className="text-[10px] text-text-body-muted font-medium">
              5 Projectile Weapons
            </span>
          </div>
          <p className="text-[11px] text-text-body-muted italic mb-1">
            {selectedTank.description}
          </p>

          <div className="grid grid-cols-5 gap-1.5">
            {selectedTank.projectiles.map((proj) => {
              const projFailed = failedImages[proj.id];
              return (
                <div
                  key={proj.id}
                  className="flex flex-col items-center p-1.5 rounded border border-border-main bg-background-high/90 text-center shadow-sm"
                  title={`${proj.name} (${proj.type})`}
                >
                  <div className="w-9 h-7 flex items-center justify-center p-0.5 bg-background/70 rounded border border-border-main mb-1">
                    {proj.image && !projFailed ? (
                      <img
                        src={proj.url}
                        alt={proj.name}
                        className="w-full h-full object-contain"
                        onError={() => setFailedImages((prev) => ({ ...prev, [proj.id]: true }))}
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: proj.color || "#38bdf8" }}
                      >
                        {proj.label}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold truncate w-full text-text-body-high">
                    {proj.name}
                  </span>
                  <span className="text-[8px] text-text-body-muted truncate w-full">
                    {proj.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

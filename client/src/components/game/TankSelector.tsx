import { useAssetQuery, type TankAsset } from "../../hooks/useAssetQuery";
import { useAssetStore } from "../../store/useAssetStore";
import TankImage from "./visuals/TankImage";
import ProjectileImage from "./visuals/ProjectileImage";

type TankSelectorProps = {
  onTankSelect?: (tank: TankAsset) => void;
  selectedTankId?: TankAsset["id"] | null;
  label?: string;
  debugMode?: boolean;
};

export default function TankSelector({
  onTankSelect,
  selectedTankId: explicitSelectedTankId,
  label = "Select Your Tank",
  debugMode = false,
}: TankSelectorProps) {
  const { data: tanks, isLoading } = useAssetQuery();
  const storeSelectedTankId = useAssetStore((state) => state.selectedTankId);
  const setStoreSelectedTank = useAssetStore((state) => state.setSelectedTank);

  const selectedTankId =
    explicitSelectedTankId !== undefined
      ? explicitSelectedTankId
      : storeSelectedTankId;

  if (isLoading || !tanks) {
    return <div className="text-xs text-text-body-muted">Loading tanks...</div>;
  }

  const selectedTank = tanks.find((t) => t.id === selectedTankId) || null;

  return (
    <div className="flex flex-col gap-3 w-full text-left">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-body-muted">
            {label}
          </label>
          {debugMode && (
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Debug Mode Active
            </span>
          )}
        </div>
      )}

      {/* Tank Cards Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {tanks.map((tank) => {
          const isSelected = tank.id === selectedTankId;

          return (
            <button
              key={tank.id}
              type="button"
              onClick={() => {
                setStoreSelectedTank(tank.id);
                onTankSelect?.(tank);
              }}
              className={`flex flex-col items-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg ${
                isSelected
                  ? "border-primary bg-primary/15 shadow-md ring-2 ring-primary/40"
                  : "border-border-main bg-background-high hover:border-primary/60 hover:bg-background-high/80"
              }`}
            >
              <div className="w-full h-14 flex items-center justify-center overflow-hidden relative">
                <TankImage tankId={tank.id} size={58} />
              </div>
              <span
                className={`text-xs font-bold mt-1.5 truncate w-full text-center tracking-wide ${
                  isSelected ? "text-primary" : "text-text-body-high"
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
        <div className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-border-main bg-background/70 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TankImage tankId={selectedTank.id} size={28} />
              <span className="text-xs font-bold text-primary">
                {selectedTank.name} Arsenal
              </span>
            </div>
            <span className="text-[10px] text-text-body-muted font-medium">
              5 Unique Weapons
            </span>
          </div>

          <p className="text-[11px] text-text-body-muted leading-relaxed">
            {selectedTank.description}
          </p>

          {/* Normal Mode: Grid of 5 Projectiles with Full Name and Image */}
          {!debugMode && (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-1">
              {selectedTank.projectiles.map((proj) => {
                const ammoText =
                  proj.initialAmmo === -1 || proj.initialAmmo === undefined
                    ? "∞"
                    : `${proj.initialAmmo}`;

                return (
                  <div
                    key={proj.id}
                    className="flex sm:flex-col items-center gap-2 sm:gap-1 p-2 rounded-lg border border-border-main bg-background-high/90 text-left sm:text-center shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center p-1 bg-background/80 rounded-md border border-border-main">
                      <ProjectileImage projectileId={proj.id} size={32} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 sm:w-full">
                      <span className="text-[11px] font-bold truncate text-text-body-high">
                        {proj.name}
                      </span>
                      <div className="flex items-center justify-between sm:justify-center gap-1.5 text-[9px] text-text-body-muted">
                        <span className="truncate">{proj.type}</span>
                        <span className="font-mono font-bold text-primary">
                          [{ammoText}]
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Debug Mode: Detailed Projectile Breakdown with Brief Description and Intended Actions */}
          {debugMode && (
            <div className="flex flex-col gap-2 mt-1">
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡ Weapon Debug Specification & Intended Behaviors</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {selectedTank.projectiles.map((proj) => {
                  const ammoText =
                    proj.initialAmmo === -1 || proj.initialAmmo === undefined
                      ? "Infinite (∞)"
                      : `${proj.initialAmmo} shots`;

                  return (
                    <div
                      key={proj.id}
                      className="flex flex-col gap-1.5 p-3 rounded-lg border border-amber-500/30 bg-amber-950/10 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 shrink-0 flex items-center justify-center p-0.5 bg-background rounded border border-amber-500/40">
                            <ProjectileImage projectileId={proj.id} size={30} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-text-body-high">
                              {proj.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-text-body-muted">
                              <span className="text-amber-400/90 font-mono">
                                ID: {proj.id}
                              </span>
                              <span>•</span>
                              <span>Ammo: {ammoText}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-background border border-border-main text-primary">
                          {proj.type}
                        </span>
                      </div>

                      {/* Brief Description */}
                      <p className="text-[11px] text-zinc-300 italic pl-1 border-l-2 border-primary/50">
                        {proj.description ?? "Standard ballistics projectile."}
                      </p>

                      {/* Intended Action / Intent */}
                      <div className="text-[10.5px] text-amber-200/90 bg-black/40 p-2 rounded border border-amber-500/20">
                        <strong className="text-amber-300 font-bold">
                          Intended Action:{" "}
                        </strong>
                        {proj.intendedUse ??
                          "Fires along ballistic arc to damage terrain and opponents upon detonation."}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

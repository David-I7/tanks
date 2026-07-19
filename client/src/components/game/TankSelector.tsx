import { useAssetStore, type TankAsset } from "../../store/useAssetStore";

type TankSelectorProps = {
  onTankSelect?: (tank: TankAsset) => void;
  label?: string;
};

export default function TankSelector({
  onTankSelect,
  label = "Select Your Tank",
}: TankSelectorProps) {
  const tanks = useAssetStore((state) => state.tanks);
  const selectedTank = useAssetStore((state) => state.selectedTank);
  const selectTank = useAssetStore((state) => state.setSelectedTank);

  if (!tanks) {
    return <div>Loading tanks...</div>;
  }

  return (
    <div className="flex flex-col gap-3 w-full text-left">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-text-body-muted">
          {label}
        </label>
      )}

      {/* Tank Cards Selection Grid */}
      <div className="grid grid-cols-3 gap-2">
        {tanks.map((tank) => {
          const isSelected = tank === selectedTank;
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
              <div className="w-16 h-12 flex items-center justify-center overflow-hidden">
                <img
                  src={tank.url}
                  alt={tank.name}
                  className="w-full h-full object-contain"
                />
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
            {selectedTank.projectiles.map((proj) => (
              <div
                key={proj.id}
                className="flex flex-col items-center p-1.5 rounded border border-border-main bg-background-high/90 text-center shadow-sm"
                title={`${proj.name} (${proj.type})`}
              >
                <div className="w-9 h-7 flex items-center justify-center p-0.5 bg-background/70 rounded border border-border-main mb-1">
                  {proj.url ? (
                    <img
                      src={proj.url}
                      alt={proj.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: proj.color }}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

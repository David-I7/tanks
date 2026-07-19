import { useAssetStore } from "../../store/useAssetStore";

type TankSelectorProps = {
  selectedTankId: string;
  onSelectTank: (tankId: string) => void;
  label?: string;
};

export default function TankSelector({
  selectedTankId,
  onSelectTank,
  label = "Select Your Tank",
}: TankSelectorProps) {
  const tanks = useAssetStore((state) => state.tanks);
  const tankDefs =
    tanks.length > 0
      ? tanks
      : [
          {
            id: "heavy-armor",
            name: "Heavy Armor",
            description: "Reinforced steel hull with heavy dual-barreled firepower.",
            url: "/graphics/tank-heavy.svg",
          },
          {
            id: "desert-striker",
            name: "Desert Striker",
            description: "High mobility chassis optimized for speed and accuracy.",
            url: "/graphics/tank-striker.svg",
          },
          {
            id: "vanguard-cyber",
            name: "Vanguard Cyber",
            description: "Futuristic navy alloy tank featuring energy rail cannons.",
            url: "/graphics/tank-vanguard.svg",
          },
        ];

  return (
    <div className="flex flex-col gap-2 w-full text-left">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-text-body-muted">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-2">
        {tankDefs.map((tank) => {
          const isSelected = tank.id === selectedTankId;
          return (
            <button
              key={tank.id}
              type="button"
              onClick={() => onSelectTank(tank.id)}
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
    </div>
  );
}

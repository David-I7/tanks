import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      type="button"
      className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-lg border border-accent/40 text-accent bg-surface-main/80 hover:bg-accent/15 hover:border-accent hover:text-accent hover:shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all duration-normal active:scale-95 select-none"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

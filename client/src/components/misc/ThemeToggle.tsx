import { Sun, Moon } from "lucide-react";
import IconButton from "../buttons/IconButton";
import { useThemeStore } from "../../store/useThemeStore";

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <IconButton
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      type="button"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </IconButton>
  );
}

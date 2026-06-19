import { create } from "zustand";
import { THEME_KEY } from "../constants";

interface ThemeStore {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}


export const useThemeStore = create<ThemeStore>((set) => {
  let prevTheme = localStorage.getItem(THEME_KEY) as ThemeStore["theme"] | null;

  if (prevTheme === null || (prevTheme !== "dark" && prevTheme !== "light")) {
    prevTheme = "dark";
    localStorage.setItem(THEME_KEY, "dark");
  }

  document.documentElement.setAttribute("data-theme", prevTheme);

  return {
    theme: prevTheme,
    setTheme: (theme) => {
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
      set({ theme })
    },
  };
});
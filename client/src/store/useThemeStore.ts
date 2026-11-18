import { create } from "zustand";

interface ThemeStore {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const THEME_KEY = "theme";

export const useThemeStore = create<ThemeStore>((set) => {
  let prevTheme = localStorage.getItem(THEME_KEY) as ThemeStore["theme"] | null;

  if (prevTheme === null || (prevTheme !== "dark" && prevTheme !== "light")) {
    prevTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    localStorage.setItem(THEME_KEY, prevTheme);
  }

  document.documentElement.setAttribute("data-theme", prevTheme);

  return {
    theme: prevTheme,
    setTheme: (theme) => {
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
      set({ theme });
    },
  };
});

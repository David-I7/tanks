import { create } from "zustand";

interface ThemeStore {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}


export const useThemeStore = create<ThemeStore>((set) => {
  let prevTheme = localStorage.getItem("theme") as ThemeStore["theme"] | null;

  if (prevTheme === null || (prevTheme !== "dark" && prevTheme !== "light")) {
    prevTheme = "dark";
    localStorage.setItem("theme", "dark");
  }

  document.documentElement.setAttribute("data-theme", prevTheme);

  return {
    theme: prevTheme,
    setTheme: (theme) => {
      localStorage.setItem("theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      set({ theme })
    },
  };
});
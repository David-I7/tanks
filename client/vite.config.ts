import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), viteReact()],
  server: {
    port: 5173,
    host: "0.0.0.0"
  }
});

import { Sun, Monitor, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 p-1 rounded-lg">
      <button
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-md transition-all duration-200 ${
          theme === "light"
            ? "bg-white/20 text-white shadow-sm"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        title="Aydınlık Tema"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-md transition-all duration-200 ${
          theme === "system"
            ? "bg-white/20 text-white shadow-sm"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        title="Sistem Teması"
      >
        <Monitor size={14} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-md transition-all duration-200 ${
          theme === "dark"
            ? "bg-white/20 text-white shadow-sm"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        title="Karanlık Tema"
      >
        <Moon size={14} />
      </button>
    </div>
  );
}

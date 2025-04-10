import { useEffect } from "react";

// Como o tema vai ser sempre dark, nem precisa de botão
export function ThemeToggle() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return null; // nada visível
}

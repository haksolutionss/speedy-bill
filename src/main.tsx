import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply dark mode by default for POS system
document.documentElement.classList.add('dark');

// On fresh app launch: clear non-essential localStorage
// Only keep auth-storage, billing-ui-storage, settings-storage
const ALLOWED_KEYS = ['auth-storage', 'billing-ui-storage', 'settings-storage'];
const keysToRemove: string[] = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && !ALLOWED_KEYS.includes(key)) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach((key) => localStorage.removeItem(key));

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply dark mode by default for POS system
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);

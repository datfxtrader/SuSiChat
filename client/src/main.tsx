import React from "react";
import { createRoot } from "react-dom/client";
import SimpleResearchApp from "./App.simple";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

root.render(<SimpleResearchApp />);
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Seamless WordPress embeds: when framed, keep the parent page informed of the
// content height so the iframe can match it (no inner scrollbar). The host page
// listens for {type:"wpr-city-budget:height"}; the snippet is in the README.
// Height is the only thing sent; no reader data leaves the page.
if (window.parent !== window) {
  const report = () => window.parent.postMessage(
    { type: "wpr-city-budget:height", height: document.documentElement.scrollHeight }, "*");
  new ResizeObserver(report).observe(document.documentElement);
  window.addEventListener("load", report);
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

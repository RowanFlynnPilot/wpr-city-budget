import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Seamless WordPress embeds: when framed, keep the parent page informed of the
// content height so the iframe can match it (no inner scrollbar). The host page
// listens for {type:"wpr-city-budget:height"}; the snippet is in the README.
// Height is the only thing sent; no reader data leaves the page. It measures
// the content, not the document: inside the iframe the document is never
// shorter than the frame, so the frame could grow but never shrink back.
if (window.parent !== window) {
  const root = document.getElementById("root");
  const report = () => window.parent.postMessage(
    { type: "wpr-city-budget:height", height: Math.ceil(root.getBoundingClientRect().height) }, "*");
  new ResizeObserver(report).observe(root);
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

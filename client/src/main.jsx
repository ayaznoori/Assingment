import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/review/:runId" element={<App />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  </React.StrictMode>
);

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Navbar          from "./components/Navbar";
import KnowledgeMarket from "./pages/KnowledgeMarket";
import DataLicensing   from "./pages/DataLicensing";
import BountyBoard     from "./pages/BountyBoard";
import MyAssets        from "./pages/MyAssets";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"         element={<KnowledgeMarket />} />
        <Route path="/license"  element={<DataLicensing />} />
        <Route path="/bounties" element={<BountyBoard />} />
        <Route path="/assets"   element={<MyAssets />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<App />);

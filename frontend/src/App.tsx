import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LobbyPage from "./pages/LobbyPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

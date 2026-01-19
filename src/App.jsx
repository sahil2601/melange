import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import GameScreen from './pages/GameScreen';
import AdminPanel from './pages/AdminPanel';

function Landing() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white space-y-8">
      <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
        MELANGE '26
      </h1>
      <h2 className="text-3xl tracking-widest uppercase">Wheel of Fortune</h2>
      <div className="flex gap-4 mt-8">
        <Link to="/game" className="px-8 py-3 bg-blue-600 rounded hover:bg-blue-700 font-bold">Launch Projector View</Link>
        <Link to="/admin" className="px-8 py-3 bg-gray-700 rounded hover:bg-gray-600 font-bold">Open Admin Panel</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import React from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Settings, ArrowRight, Gamepad2 } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>

      <div className="relative z-10 text-center max-w-5xl w-full">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6 drop-shadow-2xl tracking-tight">
          GAME SHOW CENTRAL
        </h1>
        <p className="text-slate-400 text-lg md:text-xl uppercase tracking-[0.3em] font-light mb-16">
          Select Your Interface
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          
          {/* OPTION 1: PROJECTOR VIEW */}
          <Link to="/game" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-900 border border-white/10 p-10 rounded-3xl h-full flex flex-col items-center justify-center gap-6 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Monitor size={40} />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Projector Screen</h2>
                <p className="text-slate-400 text-sm uppercase tracking-wider">For the Audience</p>
              </div>
              <span className="mt-4 flex items-center gap-2 text-blue-400 font-bold group-hover:gap-4 transition-all">
                Launch View <ArrowRight size={18}/>
              </span>
            </div>
          </Link>

          {/* OPTION 2: HOST ADMIN */}
          <Link to="/admin" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-900 border border-white/10 p-10 rounded-3xl h-full flex flex-col items-center justify-center gap-6 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Settings size={40} />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Host Control</h2>
                <p className="text-slate-400 text-sm uppercase tracking-wider">For the Game Master</p>
              </div>
              <span className="mt-4 flex items-center gap-2 text-purple-400 font-bold group-hover:gap-4 transition-all">
                Open Admin <ArrowRight size={18}/>
              </span>
            </div>
          </Link>

        </div>
      </div>
      
      <div className="mt-20 text-slate-600 text-xs font-mono uppercase tracking-widest">
        System Ready • v1.0.0
      </div>
    </div>
  );
};

export default LandingPage;
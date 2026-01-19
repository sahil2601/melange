import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseclient';
import { useGameState } from '../hooks/useGameState';
import { Trophy, Clock, ArrowRight, Check, X, Layers, Loader2, PlayCircle, Lock } from 'lucide-react';

const GameScreen = () => {
  const { gameState, teams, categories, currentQuestion, currentCategoryName } = useGameState();
  const [timeLeft, setTimeLeft] = useState(45);
  const [loading, setLoading] = useState(false);

  // --- CONTROLS ---
  const [selectedRound, setSelectedRound] = useState('Easy');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Sync with DB state
  useEffect(() => {
    if (gameState) {
      if(gameState.current_round) setSelectedRound(gameState.current_round);
      if(gameState.current_team_id) setSelectedTeamId(gameState.current_team_id);
    }
  }, [gameState]);

  // Timer Logic
  useEffect(() => {
    if (currentQuestion && !gameState.show_answer) {
      setTimeLeft(45);
      const timer = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [currentQuestion, gameState?.show_answer]);

  // --- ACTIONS ---
  const updateSettings = async (round, teamId) => {
    setSelectedRound(round);
    setSelectedTeamId(teamId);
    await supabase.from('game_state').update({ current_round: round, current_team_id: teamId, id: 1 });
  };

  // STEP 1: PICK CATEGORY (Instant - No Spin)
  const handlePickCategory = async () => {
    if (!selectedTeamId) return alert("⚠️ Please select a Team first!");
    
    setLoading(true);

    // 1. DATABASE CHECK: Find which categories actually have unused questions
    const { data: validQuestions, error } = await supabase
        .from('questions')
        .select('category_id')
        .eq('difficulty', selectedRound)
        .eq('is_used', false);

    if (error) { setLoading(false); return alert("Database Error"); }

    // Get unique Category IDs that are valid
    const validCategoryIds = [...new Set(validQuestions.map(q => q.category_id))];

    if (validCategoryIds.length === 0) {
        setLoading(false);
        return alert(`🚫 No questions left for the "${selectedRound}" round!`);
    }

    // Filter categories list
    const safeCategories = categories.filter(c => validCategoryIds.includes(c.id));
    
    // 2. SELECT WINNER
    // Math.random will naturally pick the only item if length is 1 (Single Entry Logic)
    const winnerCategory = safeCategories[Math.floor(Math.random() * safeCategories.length)];

    // 3. UPDATE DB INSTANTLY
    await supabase.from('game_state').update({ 
        is_spinning: false, 
        current_category_id: winnerCategory.id, 
        current_question_id: null,
        show_answer: false, 
        id: 1 
    });

    setLoading(false);
  };

  // STEP 2: REVEAL QUESTION
  const handleRevealQuestion = async () => {
    if(!gameState.current_category_id) return;
    
    setLoading(true);

    // Fetch questions for this specific category
    const { data: questions } = await supabase.from('questions').select('id')
        .eq('category_id', gameState.current_category_id)
        .eq('difficulty', selectedRound)
        .eq('is_used', false);

    if (questions && questions.length > 0) {
        // Select Question (Picks the single entry if only 1 exists)
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        
        // Display Question & Mark as Used
        await supabase.from('game_state').update({ current_question_id: randomQ.id, id: 1 });
        await supabase.from('questions').update({ is_used: true }).eq('id', randomQ.id);
    } else {
        alert("Error: No questions found for this category.");
    }
    setLoading(false);
  };

  const handleScore = async (isCorrect) => {
    if (isCorrect) {
        const pointsMap = { 'Easy': 100, 'Moderate': 250, 'Hard': 500, 'Star Reveal': 1000 };
        const points = pointsMap[selectedRound] || 0;
        const currentTeam = teams.find(t => t.id === selectedTeamId);
        if(currentTeam) {
            await supabase.from('teams').update({ score: currentTeam.score + points }).eq('id', currentTeam.id);
        }
    }
    await supabase.from('game_state').update({ show_answer: true, id: 1 });
  };

  const nextTurn = async () => {
    // Reset Board
    await supabase.from('game_state').update({ current_question_id: null, show_answer: false, current_category_id: null, id: 1 });
  };

  if (!gameState) return <div className="h-screen bg-slate-900 text-white flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> Initializing...</div>;

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden font-sans selection:bg-purple-500 selection:text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
      
      {/* --- TOP CONTROL BAR --- */}
      {!currentQuestion && (
        <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4 flex justify-center gap-12 z-20 shadow-2xl">
            <div className="flex flex-col items-center gap-2">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Select Difficulty</span>
                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10">
                    {['Easy', 'Moderate', 'Hard', 'Star Reveal'].map(r => (
                        <button 
                            key={r} 
                            onClick={() => updateSettings(r, selectedTeamId)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedRound === r ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Active Team</span>
                <select 
                    className="bg-black/40 border border-white/10 text-white px-6 py-2.5 rounded-xl font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm min-w-[220px]"
                    value={selectedTeamId}
                    onChange={(e) => updateSettings(selectedRound, Number(e.target.value))}
                >
                    <option value="">-- Choose Team --</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
        </div>
      )}

      {/* --- MAIN STAGE --- */}
      <div className="flex-grow flex items-center justify-center relative p-8">
        
        {/* VIEW 1: CATEGORY SELECTION */}
        {!currentQuestion && (
            <div className="relative z-10 animate-fade-in flex flex-col items-center gap-10 w-full max-w-4xl">
                
                {/* CATEGORY DISPLAY CARD */}
                <div className="relative w-full">
                    {/* Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-[3rem] blur-xl opacity-30 animate-pulse"></div>
                    
                    <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-[3rem] p-16 text-center shadow-2xl min-h-[300px] flex flex-col items-center justify-center">
                        
                        {!currentCategoryName ? (
                            <div className="text-gray-500 font-medium text-xl uppercase tracking-widest flex flex-col items-center gap-4">
                                <Layers size={48} className="opacity-20"/>
                                Waiting to Select Category...
                            </div>
                        ) : (
                            <div className="animate-scale-in">
                                <span className="text-purple-400 font-bold tracking-[0.3em] text-sm uppercase mb-4 block">Selected Category</span>
                                <h1 className="text-6xl md:text-8xl font-black drop-shadow-2xl leading-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-300">
                                    {currentCategoryName}
                                </h1>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-6">
                    {/* BUTTON 1: PICK CATEGORY */}
                    <button 
                        onClick={handlePickCategory} 
                        disabled={loading}
                        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Layers size={24}/> {currentCategoryName ? "Change Category" : "Pick Category"}
                    </button>

                    {/* BUTTON 2: REVEAL QUESTION (Appears only after category selection) */}
                    {currentCategoryName && (
                        <button 
                            onClick={handleRevealQuestion} 
                            disabled={loading}
                            className="flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 animate-bounce-in"
                        >
                            <PlayCircle size={24}/> Reveal Question
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* VIEW 2: QUESTION CARD */}
        {currentQuestion && (
            <div className="w-full max-w-6xl relative animate-in zoom-in-95 duration-500">
                {/* Timer */}
                {!gameState.show_answer && (
                    <div className={`absolute -top-20 left-1/2 -translate-x-1/2 flex items-center gap-3 text-6xl font-black px-10 py-4 rounded-full border-[6px] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-30 ${timeLeft < 10 ? 'bg-red-600 border-red-400 animate-pulse scale-110' : 'bg-slate-800 border-slate-600'}`}>
                        <Clock size={48} className={timeLeft < 10 ? 'animate-bounce' : ''}/> 
                        <span className="font-mono tabular-nums">{timeLeft}</span>
                    </div>
                )}
                
                <div className="bg-white text-slate-900 p-20 rounded-[3rem] shadow-[0_0_100px_-20px_rgba(255,255,255,0.3)] text-center border-[12px] border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>

                    <div className="flex justify-between items-center border-b-2 border-slate-100 pb-8 mb-10">
                        <div className="flex items-center gap-3 text-purple-700 font-black text-xl uppercase tracking-widest">
                            <Trophy size={28}/> {currentCategoryName}
                        </div>
                        <div className={`px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest border-2 ${selectedRound.includes('Hard') || selectedRound.includes('Star') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {selectedRound}
                        </div>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-16 leading-tight text-slate-900">
                        {currentQuestion.question_text}
                    </h1>
                    
                    {gameState.show_answer && (
                         <div className="bg-green-50 border-l-[12px] border-green-500 p-10 text-left w-full rounded-r-3xl mb-10 animate-in slide-in-from-bottom-10 fade-in duration-500 shadow-inner">
                            <span className="block text-sm font-black text-green-600 uppercase tracking-widest mb-2">Correct Answer</span>
                            <span className="text-5xl font-bold text-green-900">{currentQuestion.answer_text}</span>
                         </div>
                    )}

                    <div className="grid grid-cols-2 gap-8 mt-10">
                        {!gameState.show_answer ? (
                            <>
                                <button onClick={() => handleScore(true)} className="group flex items-center justify-center gap-4 bg-green-600 text-white py-6 rounded-3xl font-bold text-2xl hover:bg-green-500 hover:-translate-y-1 transition-all shadow-[0_10px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[10px]">
                                    <div className="bg-white/20 p-2 rounded-full"><Check strokeWidth={4} size={24}/></div> Correct
                                </button>
                                <button onClick={() => handleScore(false)} className="group flex items-center justify-center gap-4 bg-red-600 text-white py-6 rounded-3xl font-bold text-2xl hover:bg-red-500 hover:-translate-y-1 transition-all shadow-[0_10px_0_rgb(185,28,28)] active:shadow-none active:translate-y-[10px]">
                                    <div className="bg-white/20 p-2 rounded-full"><X strokeWidth={4} size={24}/></div> Incorrect
                                </button>
                            </>
                        ) : (
                            <button onClick={nextTurn} className="col-span-2 bg-slate-900 text-white py-6 rounded-3xl font-bold uppercase tracking-[0.2em] text-xl hover:bg-black hover:-translate-y-1 transition-all shadow-[0_10px_0_rgb(15,23,42)] active:shadow-none active:translate-y-[10px] flex items-center justify-center gap-4">
                                Start Next Turn <ArrowRight size={28}/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* --- RANKING FOOTER --- */}
      <div className="bg-black/40 backdrop-blur-xl border-t border-white/10 py-6 px-8">
        <div className="flex justify-center gap-8 overflow-x-auto pb-2 scrollbar-hide">
            {teams.map((t, i) => (
                <div key={t.id} className={`flex flex-col items-center px-8 py-3 rounded-2xl border transition-all min-w-[160px] ${selectedTeamId === t.id ? 'border-blue-500 bg-blue-600/20 shadow-[0_0_30px_rgba(59,130,246,0.3)] transform -translate-y-2' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-1">
                        {i === 0 && <Trophy size={14} className="text-yellow-400"/>} {t.name}
                    </div>
                    <div className={`text-4xl font-mono font-bold ${i === 0 ? 'text-yellow-400 drop-shadow-lg' : 'text-white'}`}>{t.score}</div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
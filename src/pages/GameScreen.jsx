import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useGameState } from '../hooks/useGameState';
import { Trophy, Layers, Loader2, PlayCircle, CheckCircle, XCircle, ArrowRight, RotateCcw, Sparkles, Target, Zap, Award } from 'lucide-react';

const GameScreen = () => {
  const { gameState, teams, categories, currentQuestion, currentCategoryName } = useGameState();
  const [loading, setLoading] = useState(false);
  
  // UI State for instant feedback
  const [localCategory, setLocalCategory] = useState(null);
  const [localCategoryId, setLocalCategoryId] = useState(null); 
  const [localQuestion, setLocalQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealResult, setRevealResult] = useState(null);

  // Control State
  const [selectedRound, setSelectedRound] = useState('Easy');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // --- SYNC WITH DB ---
  useEffect(() => {
    if (gameState) {
      if(gameState.current_round) setSelectedRound(gameState.current_round);
      if(gameState.current_team_id) {
        setSelectedTeamId(gameState.current_team_id);
      } else if (teams.length > 0) {
        // Auto-select first active team if none selected
        const firstActiveTeam = teams.find(t => t.is_active !== false);
        if (firstActiveTeam) {
          setSelectedTeamId(firstActiveTeam.id);
          supabase.from('game_state').update({ current_team_id: firstActiveTeam.id }).eq('id', 1);
        }
      }
      
      // Sync Category Data
      if (gameState.current_category_id) {
        setLocalCategoryId(gameState.current_category_id);
      } else if (!gameState.current_category_id) {
        // Reset for new turn
        setLocalCategory(null);
        setLocalCategoryId(null);
        setLocalQuestion(null);
        setSelectedOption(null);
        setRevealResult(null);
      }
    }
  }, [gameState, teams]);

  // --- ACTIONS ---
  
  // 1. Navbar Team Selection
  const selectTeam = async (teamId) => {
    setSelectedTeamId(teamId);
    await supabase.from('game_state').update({ current_team_id: teamId }).eq('id', 1);
  };

  // 2. Pick Category - Automatically Select Random
  const handlePickCategory = async () => {
    if (!selectedTeamId) return alert("Select a Team first!");
    setLoading(true);

    try {
      const { data: validQuestions, error } = await supabase.from('questions')
          .select('category_id').eq('difficulty', selectedRound).eq('is_used', false);

      if (error || !validQuestions.length) { 
          setLoading(false); 
          return alert("No questions left in this round!"); 
      }

      const validCategoryIds = [...new Set(validQuestions.map(q => q.category_id))];
      const safeCategories = categories.filter(c => validCategoryIds.includes(c.id));
      
      if (safeCategories.length === 0) {
          setLoading(false);
          return alert("Error: No available categories.");
      }

      // RANDOMLY SELECT ONE CATEGORY (no user choice)
      const randomCategory = safeCategories[Math.floor(Math.random() * safeCategories.length)];

      // Update Local State
      setLocalCategory(randomCategory.name);
      setLocalCategoryId(randomCategory.id);
      
      setLoading(false);
    } catch (err) {
      alert("Database Error: " + err.message);
      setLoading(false);
    }
  };

  // 3. Reveal Question
  const handleRevealQuestion = async () => {
    const activeCategoryId = localCategoryId;

    if(!activeCategoryId) {
        return alert("No category selected! Pick a category first.");
    }
    
    setLoading(true);

    try {
        const { data: questions, error } = await supabase.from('questions').select('*')
            .eq('category_id', activeCategoryId)
            .eq('difficulty', selectedRound)
            .eq('is_used', false);

        if (error) throw error;

        if (!questions || questions.length === 0) {
            alert(`No unused questions found for ${localCategory} (${selectedRound})!`);
            setLocalCategory(null);
            setLocalCategoryId(null);
            return;
        }

        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        
        // Immediately show question locally
        setLocalQuestion(randomQ);
        
        // Update game state with question ID
        const { error: updateError } = await supabase.from('game_state').update({ current_question_id: randomQ.id }).eq('id', 1);
        if (updateError) throw updateError;
        
        // Mark question as used
        const { error: markError } = await supabase.from('questions').update({ is_used: true }).eq('id', randomQ.id);
        if (markError) throw markError;

        // Wait for database to sync
        await new Promise(resolve => setTimeout(resolve, 300));
        
    } catch (err) {
        alert("Database Error: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  // 4. MCQ Interaction
  const handleOptionClick = async (optionKey) => {
    if (revealResult) return; 
    if (!localQuestion) return;
    
    setSelectedOption(optionKey);

    const isCorrect = optionKey === localQuestion.correct_option;
    setRevealResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
        const pointsMap = { 'Easy': 100, 'Moderate': 150, 'Hard': 200, 'Star Reveal': 300 };
        const points = pointsMap[selectedRound] || 0;
        const currentTeam = teams.find(t => t.id === selectedTeamId);
        if(currentTeam) {
            await supabase.from('teams').update({ score: currentTeam.score + points }).eq('id', currentTeam.id);
        }
    }
    await supabase.from('game_state').update({ show_answer: true }).eq('id', 1);
  };

  // 5. Next Turn - Auto-advance to next team or round
  const nextTurn = async () => {
    setLocalCategory(null);
    setLocalCategoryId(null);
    setLocalQuestion(null);
    setSelectedOption(null);
    setRevealResult(null);
    
    // Get active teams
    const activeTeams = teams.filter(t => t.is_active !== false);
    if (activeTeams.length === 0) return alert("No active teams!");

    // Find current team index
    const currentTeamIndex = activeTeams.findIndex(t => t.id === selectedTeamId);
    
    // Calculate next team index (cycle through active teams)
    let nextTeamIndex = (currentTeamIndex + 1) % activeTeams.length;
    const nextTeam = activeTeams[nextTeamIndex];

    // Check if we've cycled back to team 0 (all teams played in this round)
    const allTeamsCompleted = nextTeamIndex === 0;

    if (allTeamsCompleted) {
      // Auto-advance round
      const rounds = ['Easy', 'Moderate', 'Hard', 'Star Reveal'];
      const currentRoundIndex = rounds.indexOf(selectedRound);
      const nextRound = currentRoundIndex < rounds.length - 1 ? rounds[currentRoundIndex + 1] : null;

      if (!nextRound) {
        alert("Game Over! All rounds completed!");
        return;
      }

      // Update game state: new round, first team
      await supabase.from('game_state').update({ 
          current_question_id: null, 
          show_answer: false, 
          current_category_id: null,
          current_round: nextRound,
          current_team_id: nextTeam.id
      }).eq('id', 1);

      setSelectedRound(nextRound);
    } else {
      // Same round, next team
      await supabase.from('game_state').update({ 
          current_question_id: null, 
          show_answer: false, 
          current_category_id: null,
          current_team_id: nextTeam.id
      }).eq('id', 1);
    }

    setSelectedTeamId(nextTeam.id);
  };

  // 6. Reset Game
  const resetGame = async () => {
    if (!window.confirm("Reset entire game?\n\nAll team scores will be reset to 0\nAll questions will be marked as unused\nRound will be reset to Easy\n\nContinue?")) return;

    setLoading(true);

    try {
      // 1. Reset ALL team scores to 0
      await supabase.from('teams').update({ score: 0 }).neq('id', -1);

      // 2. Mark ALL questions as unused
      await supabase.from('questions').update({ is_used: false }).neq('id', -1);

      // 3. Reset game state
      await supabase.from('game_state').update({
        current_round: 'Easy',
        current_team_id: null,
        current_category_id: null,
        current_question_id: null,
        show_answer: false,
        is_spinning: false
      }).eq('id', 1);

      alert("Game Reset Successfully!");
      setSelectedRound('Easy');
      setLocalCategory(null);
      setLocalCategoryId(null);
      setLocalQuestion(null);
      setSelectedOption(null);
      setRevealResult(null);
    } catch (err) {
      alert("Error resetting game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!gameState) return <div className="h-screen bg-slate-950 text-blue-400 flex items-center justify-center gap-3"><Loader2 className="animate-spin"/> Connecting...</div>;

  const activeTeam = teams.find(t => t.id === selectedTeamId);
  const displayQuestion = localQuestion;
  const isCategorySelected = !!localCategory;
  const isQuestionRevealed = !!displayQuestion;

  const getRoundIcon = (round) => {
    switch(round) {
      case 'Easy': return '🟢';
      case 'Moderate': return '🟡';
      case 'Hard': return '🔴';
      case 'Star Reveal': return '⭐';
      default: return '◆';
    }
  };

  const getPointsForRound = (round) => {
    const pointsMap = { 'Easy': 100, 'Moderate': 150, 'Hard': 200, 'Star Reveal': 300 };
    return pointsMap[round] || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white font-sans flex flex-col">
      
      {/* NAVBAR */}
      <div className="bg-slate-800/80 backdrop-blur-md border-b-2 border-blue-500/50 shadow-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          {/* Row 1: Rounds - Better Alignment */}
          <div className="flex justify-between items-center mb-4 gap-2 pt-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
              <Zap size={14} /> Round
            </div>
            <div className="flex gap-2 flex-1">
              {['Easy', 'Moderate', 'Hard', 'Star Reveal'].map(r => (
                <button 
                  key={r} 
                  onClick={() => supabase.from('game_state').update({ current_round: r }).eq('id', 1)}
                  className={`px-3 md:px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                    selectedRound === r 
                      ? 'bg-blue-600 text-white shadow-lg scale-105' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title={`${getPointsForRound(r)} points`}
                >
                  {getRoundIcon(r)} {r}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Teams with Scores - Better Spacing */}
          <div className="flex justify-between items-center gap-3 pt-2 pb-2">
            <div className="flex gap-2 overflow-x-auto flex-1 pb-1 px-2 scrollbar-thin scrollbar-thumb-slate-600">
              {teams.filter(t => t.is_active !== false).map(t => (
                <button 
                  key={t.id}
                  onClick={() => selectTeam(t.id)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap text-sm font-semibold min-w-max ${
                    selectedTeamId === t.id
                      ? 'bg-green-600/20 border-green-500 text-green-100 shadow-lg shadow-green-500/30 scale-105' 
                      : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  <Target size={16} />
                  <span>{t.name}</span>
                  <span className="font-black text-yellow-300">{t.score}</span>
                </button>
              ))}
            </div>

            {/* Reset Button */}
            <button 
              onClick={resetGame} 
              disabled={loading}
              className="px-3 md:px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold text-xs md:text-sm flex items-center gap-1 transition-all disabled:opacity-50 whitespace-nowrap"
              title="Reset scores and questions"
            >
              <RotateCcw size={16}/> Reset
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-grow flex items-center justify-center p-4 md:p-6">
        
        {/* SCREEN 1: READY FOR CATEGORY SELECTION */}
        {!isCategorySelected && !isQuestionRevealed && (
          <div className="w-full max-w-4xl flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Large Display Box */}
            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-slate-900 border-2 border-white/10 rounded-[2.5rem] p-12 md:p-20 text-center shadow-2xl flex flex-col items-center justify-center min-h-[300px] md:min-h-[350px]">
                <div className="flex flex-col items-center gap-4">
                  <Sparkles size={56} className="text-yellow-400 opacity-70 animate-pulse" />
                  <div className="text-xl md:text-3xl font-light uppercase tracking-[0.3em] text-slate-400">
                    Ready for Round
                  </div>
                  <div className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    {selectedRound}
                  </div>
                  <div className="text-sm text-slate-500 mt-4">
                    {getPointsForRound(selectedRound)} points on correct answer
                  </div>
                </div>
              </div>
            </div>

            {/* Pick Category Button */}
            <button 
              onClick={handlePickCategory}
              disabled={loading || !selectedTeamId}
              className={`group px-8 md:px-12 py-4 md:py-6 rounded-2xl font-bold text-lg md:text-xl shadow-lg transition-all active:scale-95 duration-200 flex items-center gap-3 ${
                !selectedTeamId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white hover:shadow-xl'
              }`}
              title="Automatically select a random category"
            >
              {loading ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24}/>}
              {loading ? 'Spinning...' : 'Spin Category'}
            </button>
          </div>
        )}

        {/* SCREEN 2: CATEGORY SELECTED - REVEAL QUESTION */}
        {isCategorySelected && !isQuestionRevealed && (
          <div className="w-full max-w-4xl flex flex-col items-center gap-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {/* Category Display */}
            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-slate-800 border-2 border-purple-500/50 rounded-[2.5rem] p-16 md:p-24 text-center shadow-2xl">
                <div className="flex flex-col items-center gap-4">
                  <Layers size={48} className="text-purple-400" />
                  <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    {localCategory}
                  </h2>
                  <div className="text-sm text-slate-400 mt-4">
                    Playing for {activeTeam?.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Reveal Question Button */}
            <button 
              onClick={handleRevealQuestion}
              disabled={loading}
              className="px-8 md:px-12 py-4 md:py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-bold text-lg md:text-xl shadow-lg transition-all active:scale-95 hover:shadow-xl duration-200 flex items-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={24}/> : <PlayCircle size={24}/>}
              {loading ? 'Loading...' : 'Reveal Question'}
            </button>
          </div>
        )}

        {/* SCREEN 3: QUESTION WITH OPTIONS */}
        {isQuestionRevealed && (
          <div className="w-full max-w-5xl animate-in slide-in-from-bottom-8 fade-in duration-500">
            {/* Question Box */}
            <div className="bg-gradient-to-br from-white to-slate-100 text-slate-900 rounded-3xl p-8 md:p-12 text-center shadow-2xl mb-8 border-t-4 border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10">
                <Award size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-center items-center gap-3 mb-6 opacity-70 flex-wrap">
                  <span className="font-bold tracking-wider uppercase text-xs md:text-sm bg-blue-100 text-blue-700 px-3 md:px-4 py-1 rounded-full">{localCategory}</span>
                  <span className="font-bold tracking-wider uppercase text-xs md:text-sm bg-yellow-100 text-yellow-700 px-3 md:px-4 py-1 rounded-full">{selectedRound} - {getPointsForRound(selectedRound)}pts</span>
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold leading-tight text-slate-800">
                  {displayQuestion?.question_text}
                </h1>
              </div>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-8">
              {['A', 'B', 'C', 'D'].map((opt) => {
                const optionText = displayQuestion[`option_${opt.toLowerCase()}`];
                if (!optionText) return null;
                
                const isCorrect = opt === displayQuestion.correct_option;
                const isSelected = selectedOption === opt;
                
                let containerClass = "bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 text-slate-100 hover:from-slate-600 hover:to-slate-700 hover:border-slate-500";
                let circleClass = "bg-slate-600 text-slate-100 border-2 border-slate-500";

                if (revealResult) {
                  if (isCorrect) {
                    containerClass = "bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border-2 border-emerald-500 text-emerald-50 shadow-lg shadow-emerald-500/50";
                    circleClass = "bg-emerald-600 text-white border-2 border-emerald-400";
                  } else if (isSelected) {
                    containerClass = "bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500 text-red-100 opacity-60";
                    circleClass = "bg-red-600 text-white border-2 border-red-400";
                  } else {
                    containerClass = "bg-slate-900/50 border-2 border-slate-800 text-slate-500 opacity-40";
                  }
                }

                return (
                  <button 
                    key={opt}
                    onClick={() => handleOptionClick(opt)}
                    disabled={!!revealResult}
                    className={`group p-6 md:p-8 rounded-2xl border-2 transition-all duration-300 text-left flex items-center gap-5 ${containerClass} ${!revealResult && 'hover:scale-105 active:scale-95'}`}
                  >
                    <div className={`w-14 md:w-16 h-14 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl font-black transition-colors ${circleClass}`}>
                      {opt}
                    </div>
                    <span className="text-lg md:text-xl font-semibold flex-grow leading-tight">{optionText}</span>
                    {revealResult && isCorrect && <CheckCircle className="text-emerald-400 flex-shrink-0 animate-bounce" size={32}/>}
                    {revealResult && isSelected && !isCorrect && <XCircle className="text-red-400 flex-shrink-0" size={32}/>}
                  </button>
                );
              })}
            </div>

            {/* Result Message & Next Button */}
            {revealResult && (
              <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className={`text-2xl md:text-3xl font-black px-6 md:px-8 py-4 rounded-full text-white shadow-lg transition-all ${
                  revealResult === 'correct' 
                    ? 'bg-emerald-600 shadow-emerald-500/50 scale-100' 
                    : 'bg-red-600 shadow-red-500/50'
                }`}>
                  {revealResult === 'correct' ? (
                    <span className="flex items-center gap-3 text-2xl md:text-3xl">
                      <CheckCircle size={32} className="animate-bounce" /> Correct!
                      <span className="text-3xl md:text-4xl font-black text-green-300">+{getPointsForRound(selectedRound)}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-3 text-2xl md:text-3xl">
                      <XCircle size={32} /> Wrong!
                      <span className="text-3xl md:text-4xl font-black text-red-300">0 Pts</span>
                    </span>
                  )}
                </div>

                <button 
                  onClick={nextTurn}
                  className="px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-bold text-lg md:text-xl shadow-lg transition-all active:scale-95 hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3"
                >
                  <span>Next Team</span> <ArrowRight size={24}/>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;

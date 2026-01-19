import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useGameState } from '../hooks/useGameState';
import { Trash2, Plus, Users, LayoutGrid, FileQuestion, RefreshCw, Eye, Edit2, X, Check } from 'lucide-react';

const AdminPanel = () => {
  // We still use global state for categories, but we will manage TEAMS locally for instant updates
  const { categories } = useGameState();
  
  // Local state for instant updates
  const [localTeams, setLocalTeams] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- FORM STATES ---
  const [newTeamName, setNewTeamName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    category_id: '',
    difficulty: 'Easy',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A' 
  });

  // --- PREVIEW & EDIT STATES ---
  const [showPreview, setShowPreview] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchTeams();
    fetchAllQuestions();
  }, []);

  // Function to manually get the latest list INSTANTLY
  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('id', { ascending: true });
    if (data) setLocalTeams(data);
  };

  const fetchAllQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false });
    if (data) setAllQuestions(data);
  };

  // --- ACTIONS ---

  const addCategory = async () => {
    if (!newCategoryName.trim()) return alert("Enter category name");
    await supabase.from('categories').insert([{ name: newCategoryName }]);
    setNewCategoryName('');
    window.location.reload(); // Categories don't change often, simple reload is fine
  };

  const addTeam = async () => {
    if (!newTeamName.trim()) return alert("Enter team name");
    setLoading(true);
    
    // 1. Insert into DB
    const { error } = await supabase.from('teams').insert([{ name: newTeamName, score: 0, is_active: true }]);
    
    if (error) {
        alert("Error adding team: " + error.message);
    } else {
        setNewTeamName('');
        // 2. FORCE REFRESH IMMEDIATELY
        await fetchTeams(); 
    }
    setLoading(false);
  };

  const toggleTeamStatus = async (team) => {
    // Optimistic update (update UI before DB to feel instant)
    const updatedTeams = localTeams.map(t => t.id === team.id ? { ...t, is_active: !t.is_active } : t);
    setLocalTeams(updatedTeams);

    await supabase.from('teams').update({ is_active: !team.is_active }).eq('id', team.id);
    await fetchTeams(); // Sync with DB to be sure
  };

  const deleteItem = async (table, id) => {
    if(!window.confirm("Are you sure you want to delete this?")) return;
    
    await supabase.from(table).delete().eq('id', id);
    
    if (table === 'teams') {
        await fetchTeams(); // Instant refresh for teams
    } else {
        window.location.reload(); // Reload for categories
    }
  };

  const addQuestion = async () => {
    // 1. Validation
    if (!newQuestion.category_id) return alert("⚠️ Please select a Category!");
    if (!newQuestion.question_text) return alert("⚠️ Please enter the question text!");
    if (!newQuestion.option_a || !newQuestion.option_b) return alert("⚠️ Please fill at least Option A and B!");

    setLoading(true);

    // 2. LOGIC FIX: Generate 'answer_text' automatically
    const correctKey = `option_${newQuestion.correct_option.toLowerCase()}`;
    const finalAnswerText = newQuestion[correctKey]; 

    // 3. Prepare the data payload
    const questionData = {
        ...newQuestion,
        answer_text: finalAnswerText,
        is_used: false 
    };

    // 4. Send to Supabase
    const { error } = await supabase.from('questions').insert([questionData]);

    if (error) {
        alert("Database Error: " + error.message);
    } else {
        alert("✅ Question Saved Successfully!");
        setShowPreview(false);
        // Reset form but keep category/difficulty for faster data entry
        setNewQuestion({ 
            ...newQuestion, 
            question_text: '', 
            option_a: '', 
            option_b: '', 
            option_c: '', 
            option_d: '' 
        });
        await fetchAllQuestions();
    }
    setLoading(false);
  };

  const updateQuestion = async () => {
    if (!editingQuestion) return;
    setLoading(true);

    const correctKey = `option_${editingQuestion.correct_option.toLowerCase()}`;
    const finalAnswerText = editingQuestion[correctKey];

    const { error } = await supabase.from('questions').update({
        ...editingQuestion,
        answer_text: finalAnswerText
    }).eq('id', editingQuestion.id);

    if (error) {
        alert("Database Error: " + error.message);
    } else {
        alert("✅ Question Updated Successfully!");
        setEditingQuestion(null);
        setShowEditForm(false);
        await fetchAllQuestions();
    }
    setLoading(false);
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    
    await supabase.from('questions').delete().eq('id', id);
    await fetchAllQuestions();
  };

  const resetGame = async () => {
    if (!window.confirm("⚠️ This will reset the entire game!\n\n• Reset all team scores to 0\n• Mark all questions as unused\n• Reset round to Easy\n\nContinue?")) return;

    setLoading(true);

    try {
      // 1. Reset ALL team scores to 0
      await supabase.from('teams').update({ score: 0 }).neq('id', -1);

      // 2. Mark ALL questions as unused (is_used = false)
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

      alert("✅ Game Reset Successfully! All teams are at 0 points and questions are ready to play.");
      await fetchTeams();
      await fetchAllQuestions();
    } catch (err) {
      alert("Error resetting game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 p-8">
        <div className="max-w-7xl mx-auto">
            {/* HEADER WITH RESET BUTTON */}
            <div className="mb-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
                <button onClick={resetGame} disabled={loading} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:bg-gray-400 transition-all shadow-lg">
                    🔄 Reset Game
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: TEAMS & CATEGORIES */}
            <div className="lg:col-span-4 space-y-8">
                
                {/* TEAMS MANAGER */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Users className="text-blue-600"/> Teams</h2>
                        <button onClick={fetchTeams} className="text-gray-400 hover:text-blue-600 transition-colors"><RefreshCw size={16}/></button>
                    </div>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            className="border p-2 rounded w-full outline-none focus:border-blue-500" 
                            placeholder="New Team Name" 
                            value={newTeamName} 
                            onChange={e => setNewTeamName(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                        />
                        <button onClick={addTeam} disabled={loading} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                            <Plus/>
                        </button>
                    </div>

                    <ul className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {localTeams.map(t => (
                            <li key={t.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${t.is_active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                                <span className={`font-medium ${t.is_active ? 'text-gray-800' : 'text-gray-500 line-through'}`}>{t.name}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => toggleTeamStatus(t)} 
                                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${t.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        {t.is_active ? 'Active' : 'Disabled'}
                                    </button>
                                    <button onClick={() => deleteItem('teams', t.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </li>
                        ))}
                        {localTeams.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No teams added yet.</p>}
                    </ul>
                </div>

                {/* CATEGORIES MANAGER */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><LayoutGrid className="text-purple-600"/> Categories</h2>
                    <div className="flex gap-2 mb-4">
                        <input className="border p-2 rounded w-full outline-none focus:border-purple-500" placeholder="New Category" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                        <button onClick={addCategory} className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700"><Plus/></button>
                    </div>
                    <ul className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {categories.map(c => (
                            <li key={c.id} className="flex justify-between items-center p-2 rounded border bg-white hover:bg-purple-50 transition-colors">
                                <span className="font-medium text-gray-700">{c.name}</span>
                                <button onClick={() => deleteItem('categories', c.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* RIGHT COLUMN: ADD QUESTION & QUESTIONS LIST */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* ADD QUESTION FORM */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><FileQuestion className="text-green-600"/> Add MCQ Question</h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <select className="border p-3 rounded-lg bg-gray-50 focus:bg-white transition-colors" value={newQuestion.category_id} onChange={e => setNewQuestion({...newQuestion, category_id: e.target.value})}>
                            <option value="">Select Category...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select className="border p-3 rounded-lg bg-gray-50 focus:bg-white transition-colors" value={newQuestion.difficulty} onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value})}>
                            <option>Easy</option><option>Moderate</option><option>Hard</option><option>Star Reveal</option>
                        </select>
                    </div>

                    <textarea className="w-full border p-3 rounded-lg mb-4 h-24 bg-gray-50 focus:bg-white transition-colors" placeholder="Question Text..." value={newQuestion.question_text} onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {['A', 'B', 'C', 'D'].map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                                <span className="font-bold text-gray-400 w-6">{opt}.</span>
                                <input 
                                    className="border p-2 rounded-lg w-full focus:border-green-500 outline-none" 
                                    placeholder={`Option ${opt}`} 
                                    value={newQuestion[`option_${opt.toLowerCase()}`]}
                                    onChange={e => setNewQuestion({...newQuestion, [`option_${opt.toLowerCase()}`]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mb-6 flex items-center gap-4">
                        <label className="font-bold text-gray-700">Correct Answer:</label>
                        <div className="flex gap-2">
                            {['A', 'B', 'C', 'D'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setNewQuestion({...newQuestion, correct_option: opt})}
                                    className={`w-10 h-10 rounded-lg font-bold transition-all ${newQuestion.correct_option === opt ? 'bg-green-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowPreview(true)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all">
                            <Eye className="inline mr-2" size={18}/> Preview Question
                        </button>
                        <button onClick={addQuestion} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg hover:shadow-green-500/30 transition-all">
                            Save Question
                        </button>
                    </div>
                </div>

                {/* QUESTIONS LIST */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><FileQuestion className="text-indigo-600"/> All Questions</h2>
                    
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                        {allQuestions.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No questions added yet.</p>
                        ) : (
                            allQuestions.map(q => {
                                const catName = categories.find(c => c.id === q.category_id)?.name || 'Unknown';
                                return (
                                    <div key={q.id} className="p-4 border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                    {catName} • {q.difficulty} {q.is_used && '• ✓ USED'}
                                                </div>
                                                <p className="font-medium text-gray-800 text-sm">{q.question_text}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => {setEditingQuestion(q); setShowEditForm(true);}} className="text-indigo-600 hover:text-indigo-800 transition-colors"><Edit2 size={18}/></button>
                                                <button onClick={() => deleteQuestion(q.id)} className="text-red-600 hover:text-red-800 transition-colors"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <p>A: {q.option_a}</p>
                                            <p>B: {q.option_b}</p>
                                            {q.option_c && <p>C: {q.option_c}</p>}
                                            {q.option_d && <p>D: {q.option_d}</p>}
                                            <p className="font-bold text-green-700 mt-2">✓ Correct: {q.correct_option}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* PREVIEW MODAL */}
        {showPreview && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800">Preview Question</h3>
                        <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                    </div>

                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                            {categories.find(c => c.id === newQuestion.category_id)?.name || 'No Category'} • {newQuestion.difficulty}
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4">{newQuestion.question_text}</h4>
                        
                        <div className="space-y-2 mb-4">
                            {['A', 'B', 'C', 'D'].map((opt) => {
                                const text = newQuestion[`option_${opt.toLowerCase()}`];
                                if (!text) return null;
                                return (
                                    <div key={opt} className={`p-3 rounded-lg border-2 ${newQuestion.correct_option === opt ? 'bg-green-100 border-green-500' : 'bg-gray-50 border-gray-200'}`}>
                                        <span className="font-bold mr-2">{opt}.</span>
                                        <span className="text-gray-700">{text}</span>
                                        {newQuestion.correct_option === opt && <span className="ml-2 text-green-700 font-bold">✓ Correct</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowPreview(false)} className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-all">
                            Cancel
                        </button>
                        <button onClick={addQuestion} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                            <Check size={20}/> Save Question
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* EDIT MODAL */}
        {showEditForm && editingQuestion && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800">Edit Question</h3>
                        <button onClick={() => {setShowEditForm(false); setEditingQuestion(null);}} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <select className="border p-3 rounded-lg bg-gray-50" value={editingQuestion.category_id} onChange={e => setEditingQuestion({...editingQuestion, category_id: e.target.value})}>
                            <option value="">Select Category...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select className="border p-3 rounded-lg bg-gray-50" value={editingQuestion.difficulty} onChange={e => setEditingQuestion({...editingQuestion, difficulty: e.target.value})}>
                            <option>Easy</option><option>Moderate</option><option>Hard</option><option>Star Reveal</option>
                        </select>
                    </div>

                    <textarea className="w-full border p-3 rounded-lg mb-4 h-24 bg-gray-50" placeholder="Question Text..." value={editingQuestion.question_text} onChange={e => setEditingQuestion({...editingQuestion, question_text: e.target.value})} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {['A', 'B', 'C', 'D'].map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                                <span className="font-bold text-gray-400 w-6">{opt}.</span>
                                <input 
                                    className="border p-2 rounded-lg w-full outline-none" 
                                    placeholder={`Option ${opt}`} 
                                    value={editingQuestion[`option_${opt.toLowerCase()}`]}
                                    onChange={e => setEditingQuestion({...editingQuestion, [`option_${opt.toLowerCase()}`]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mb-6 flex items-center gap-4">
                        <label className="font-bold text-gray-700">Correct Answer:</label>
                        <div className="flex gap-2">
                            {['A', 'B', 'C', 'D'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setEditingQuestion({...editingQuestion, correct_option: opt})}
                                    className={`w-10 h-10 rounded-lg font-bold transition-all ${editingQuestion.correct_option === opt ? 'bg-green-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => {setShowEditForm(false); setEditingQuestion(null);}} className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-all">
                            Cancel
                        </button>
                        <button onClick={updateQuestion} disabled={loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2">
                            <Check size={20}/> Update Question
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    </div>
  );
};

export default AdminPanel;
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useGameState } from '../hooks/useGameState';
import { Trash2, Plus, Save, Database, AlertCircle } from 'lucide-react';

const AdminPanel = () => {
  const { categories, teams } = useGameState();
  
  // --- FORM STATES ---
  const [newTeamName, setNewTeamName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    category_id: '',
    difficulty: 'Easy',
    question_text: '',
    answer_text: ''
  });

  // --- ACTIONS ---
  const addCategory = async () => {
    if (!newCategoryName.trim()) return alert("Please enter a category name");
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName }]);
    if (error) alert(error.message);
    else setNewCategoryName('');
  };

  const addTeam = async () => {
    if (!newTeamName.trim()) return alert("Please enter a team name");
    const { error } = await supabase.from('teams').insert([{ name: newTeamName, score: 0 }]);
    if (error) alert(error.message);
    else setNewTeamName('');
  };

  const addQuestion = async () => {
    if (!newQuestion.category_id) return alert("Please select a Category!");
    if (!newQuestion.question_text || !newQuestion.answer_text) return alert("Please fill in Question and Answer!");

    const { error } = await supabase.from('questions').insert([newQuestion]);
    if (error) alert("Error: " + error.message);
    else {
        alert("✅ Question Saved Successfully!");
        setNewQuestion({ ...newQuestion, question_text: '', answer_text: '' });
    }
  };

  const deleteItem = async (table, id) => {
    if(!window.confirm("Are you sure? Deleting this might break linked questions.")) return;
    await supabase.from(table).delete().eq('id', id);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER: CLEAN - NO BUTTONS */}
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-6">
            <div className="bg-blue-600 p-3 rounded-lg text-white shadow-lg">
                <Database size={24}/>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Backend Setup</h1>
                <p className="text-slate-500 text-sm">Add Teams, Categories, and Questions to the database.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. MANAGE CATEGORIES */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h2 className="font-bold text-lg text-purple-700">1. Categories</h2>
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">{categories.length}</span>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <input 
                        className="border border-slate-300 p-2 rounded-lg flex-grow outline-none focus:border-purple-500 transition-colors" 
                        placeholder="e.g. Pop Culture" 
                        value={newCategoryName} 
                        onChange={e => setNewCategoryName(e.target.value)} 
                    />
                    <button onClick={addCategory} className="bg-purple-600 text-white px-4 rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
                        <Plus size={20}/>
                    </button>
                </div>
                
                <ul className="h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {categories.length === 0 && <p className="text-sm text-slate-400 italic text-center mt-10">No categories yet.</p>}
                    {categories.map(c => (
                        <li key={c.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm hover:border-purple-200 transition-colors">
                            <span className="font-medium text-slate-700">{c.name}</span> 
                            <button onClick={() => deleteItem('categories', c.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 2. MANAGE TEAMS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h2 className="font-bold text-lg text-blue-700">2. Teams</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{teams.length}</span>
                </div>

                <div className="flex gap-2 mb-4">
                    <input 
                        className="border border-slate-300 p-2 rounded-lg flex-grow outline-none focus:border-blue-500 transition-colors" 
                        placeholder="e.g. Team Alpha" 
                        value={newTeamName} 
                        onChange={e => setNewTeamName(e.target.value)} 
                    />
                    <button onClick={addTeam} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus size={20}/>
                    </button>
                </div>

                <ul className="h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {teams.length === 0 && <p className="text-sm text-slate-400 italic text-center mt-10">No teams yet.</p>}
                    {teams.map(t => (
                        <li key={t.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm hover:border-blue-200 transition-colors">
                            <span className="font-medium text-slate-700">{t.name}</span> 
                            <button onClick={() => deleteItem('teams', t.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 3. ADD QUESTIONS */}
            <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 lg:col-span-2">
                <h2 className="font-bold text-xl mb-6 text-green-700 flex items-center gap-2 pb-4 border-b border-slate-100">
                    <Save size={24}/> 3. Add to Question Bank
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* DROPDOWNS */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                            <div className="relative">
                                <select 
                                    className="w-full border border-slate-300 bg-slate-50 p-3 rounded-lg outline-none focus:border-green-500 focus:bg-white transition-colors appearance-none cursor-pointer" 
                                    value={newQuestion.category_id} 
                                    onChange={e => setNewQuestion({...newQuestion, category_id: e.target.value})}
                                >
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {categories.length === 0 && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/> Create a category above first.</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Difficulty</label>
                            <select 
                                className="w-full border border-slate-300 bg-slate-50 p-3 rounded-lg outline-none focus:border-green-500 focus:bg-white transition-colors appearance-none cursor-pointer" 
                                value={newQuestion.difficulty} 
                                onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                            >
                                <option>Easy</option>
                                <option>Moderate</option>
                                <option>Hard</option>
                                <option>Star Reveal</option>
                            </select>
                        </div>
                    </div>

                    {/* TEXT INPUTS */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Question Text</label>
                            <textarea 
                                className="w-full border border-slate-300 bg-slate-50 p-3 rounded-lg h-32 outline-none focus:border-green-500 focus:bg-white transition-colors resize-none" 
                                placeholder="Type the question here..." 
                                value={newQuestion.question_text} 
                                onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correct Answer</label>
                            <input 
                                className="w-full border border-slate-300 bg-slate-50 p-3 rounded-lg outline-none focus:border-green-500 focus:bg-white transition-colors" 
                                placeholder="Type the answer here..." 
                                value={newQuestion.answer_text} 
                                onChange={e => setNewQuestion({...newQuestion, answer_text: e.target.value})} 
                            />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={addQuestion} 
                    className="mt-8 w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg hover:shadow-xl transition-all active:scale-[0.99] flex justify-center items-center gap-2"
                >
                    <Save size={20}/> Save Question to Database
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseclient';

export const useGameState = () => {
  const [gameState, setGameState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]); // Stores the list from DB
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentCategoryName, setCurrentCategoryName] = useState(null);

  const fetchInitialData = async () => {
    // 1. Fetch Game State
    const { data: state } = await supabase.from('game_state').select('*').single();
    
    // 2. Fetch Teams (Sorted by Score for Leaderboard)
    const { data: teamList } = await supabase.from('teams').select('*').order('score', { ascending: false });
    
    // 3. Fetch Categories (For Wheel & Dropdowns)
    const { data: catList } = await supabase.from('categories').select('*');

    setGameState(state);
    setTeams(teamList || []);
    setCategories(catList || []);

    // 4. Resolve Category Name (ID -> Text)
    if (state?.current_category_id && catList) {
        const cat = catList.find(c => c.id === state.current_category_id);
        setCurrentCategoryName(cat ? cat.name : "Unknown");
    } else {
        setCurrentCategoryName(null);
    }

    // 5. Fetch Question
    if (state?.current_question_id) {
      const { data: q } = await supabase.from('questions').select('*').eq('id', state.current_question_id).single();
      // Attach category name manually for display convenience
      if(q && catList) {
          const qCat = catList.find(c => c.id === q.category_id);
          q.category_name = qCat ? qCat.name : "";
      }
      setCurrentQuestion(q);
    } else {
      setCurrentQuestion(null);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Subscribe to all relevant tables
    const subscriptions = [
        supabase.channel('public:game_state').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, () => fetchInitialData()).subscribe(),
        supabase.channel('public:teams').on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchInitialData()).subscribe(),
        supabase.channel('public:categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchInitialData()).subscribe()
    ];

    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
  }, []);

  return { gameState, teams, categories, currentQuestion, currentCategoryName };
};
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export const useGameState = () => {
  const [gameState, setGameState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]); // Stores the list from DB
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentCategoryName, setCurrentCategoryName] = useState(null);

  const fetchInitialData = useCallback(async () => {
    try {
      // 1. Fetch Game State
      const { data: state, error: stateError } = await supabase.from('game_state').select('*').single();
      if (stateError) {
        console.error('Error fetching game state:', stateError);
        return;
      }
      
      // 2. Fetch Teams (In original order)
      const { data: teamList, error: teamsError } = await supabase.from('teams').select('*').order('id', { ascending: true });
      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
      }
      console.log('Teams fetched from DB:', teamList);
      
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

      // 5. Fetch Question - with better error handling
      if (state?.current_question_id) {
        const { data: q, error: qError } = await supabase.from('questions').select('*').eq('id', state.current_question_id).single();
        
        if (qError) {
          console.warn('Could not fetch current question:', qError);
          setCurrentQuestion(null);
        } else if (q) {
          console.log('Question fetched successfully:', q.id, q.question_text);
          // Attach category name manually for display convenience
          if(catList) {
              const qCat = catList.find(c => c.id === q.category_id);
              q.category_name = qCat ? qCat.name : "";
          }
          setCurrentQuestion(q);
        }
      } else {
        if (state?.current_question_id === null) {
          console.log('No current question ID in game state');
        }
        setCurrentQuestion(null);
      }
    } catch (err) {
      console.error('Error in fetchInitialData:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    // Subscribe to all relevant tables with unique channel names
    const subscriptions = [
        supabase.channel('changes::game_state').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, (payload) => {
            console.log('Game state updated:', payload);
            fetchInitialData();
        }).subscribe(),
        supabase.channel('changes::teams').on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
            console.log('Teams updated:', payload);
            fetchInitialData();
        }).subscribe(),
        supabase.channel('changes::categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
            console.log('Categories updated:', payload);
            fetchInitialData();
        }).subscribe(),
        supabase.channel('changes::questions').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions' }, (payload) => {
            console.log('Questions updated:', payload);
            fetchInitialData();
        }).subscribe()
    ];

    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
  }, [fetchInitialData]);

  return { gameState, teams, categories, currentQuestion, currentCategoryName, refetchTeams: fetchInitialData };
};
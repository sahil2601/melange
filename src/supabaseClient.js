import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixlzcxymfqexedzocnvm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bHpjeHltZnFleGVkem9jbnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDk2MTksImV4cCI6MjA4NDMyNTYxOX0.jYIsXbzjxYSj1qPYCOi9bEMZLjyWKnBqJezsLu4gUYk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
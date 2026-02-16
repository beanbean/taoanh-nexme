import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vkhqqybnvnoagxqglnkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraHFxeWJudm5vYWd4cWdsbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMjk2MDQsImV4cCI6MjA3OTYwNTYwNH0.fyPJtiRcTei8pgduUnaqtq939FD7V67OGEbTXBjoVh4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
console.log('Testing connection...');
const { data, error } = await supabase.from('marathon_datasets').select('*').limit(1);
console.log('Datasets test:', error ? error.message : 'Connected');

const players = await supabase.from('marathon_players').select('*').limit(1);
console.log('Players test:', players.error ? players.error.message : 'Connected');

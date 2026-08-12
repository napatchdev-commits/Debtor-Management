import { createClient } from '@supabase/supabase-js';

const url = 'https://unpcjxuqlrztbxbpqxsu.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVucGNqeHVxbHJ6dGJ4YnBxeHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDc1MjIsImV4cCI6MjA3NTQyMzUyMn0.wT_6xG9o4cQx4nK_R7L-xG4j1x2x3x4x5x6x7x8';

console.log('Testing Supabase query on project:', url);
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: {
    transport: class DummyTransport {}
  }
});

async function runTest() {
  const { data: debtors, error } = await supabase.from('debtors').select('*');
  console.log('Debtors select error:', error);
  console.log('Debtors count:', debtors ? debtors.length : 0);
  console.log('Debtors data:', debtors);
}

runTest();

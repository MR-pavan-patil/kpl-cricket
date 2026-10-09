const { createClient } = require('@supabase/supabase-js');
const url = 'https://ewmvlxiozhebpxgzttyk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bXZseGlvemhlYnB4Z3p0dHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTUwNTMsImV4cCI6MjA5NzMzMTA1M30.fpCdcoswb7KWuxTeHRpTaBckF5G78NnVUuuGYnCKI3c';
const sb = createClient(url, key);

async function test() {
  const { data: teams } = await sb.from('teams').select('id, name');
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  console.log('Teams in DB:');
  teams.forEach(t => console.log(` - ${t.name}: ${t.id}`));

  const { data: matches } = await sb.from('matches').select('*').gte('match_date', '2026-10-01').order('match_date', { ascending: true });
  console.log('\nMatches in DB (Season 2):', matches ? matches.length : 0);
  matches?.forEach((m, i) => {
    console.log(`${i + 1}. [${m.match_date}] ${teamMap[m.team1_id] || m.team1_id} vs ${teamMap[m.team2_id] || m.team2_id} | Stage: ${m.stage} | Desc: ${m.result_desc}`);
  });
}
test();

const { createClient } = require('@supabase/supabase-js');

const url = 'https://ewmvlxiozhebpxgzttyk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bXZseGlvemhlYnB4Z3p0dHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTUwNTMsImV4cCI6MjA5NzMzMTA1M30.fpCdcoswb7KWuxTeHRpTaBckF5G78NnVUuuGYnCKI3c';
const supabase = createClient(url, key);

async function run() {
  console.log('Logging in as kpl@gmail.com...');
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kpl@gmail.com',
    password: 'Kpl@123'
  });

  if (authError) {
    console.error('Authentication failed:', authError.message);
    process.exit(1);
  }
  console.log('Logged in successfully!');

  // Clean up the dummy test match created yesterday if present
  console.log('Cleaning up any old test match...');
  await supabase.from('matches').delete().eq('id', 'f3b5d4fb-568f-48e9-8d64-3a5674b6015c');

  // Also remove any existing matches in October 2026 to ensure clean schedule
  const { data: existingOct } = await supabase.from('matches').select('id').gte('match_date', '2026-10-01');
  if (existingOct && existingOct.length > 0) {
    console.log(`Removing ${existingOct.length} existing October matches for clean setup...`);
    for (const m of existingOct) {
      await supabase.from('matches').delete().eq('id', m.id);
    }
  }

  // Exact Team IDs from Database
  const TEAMS = {
    SBI_KOSAM: 'eac15202-8402-41f6-9696-59a2b3fe55ca',
    PSB: '4c01d61c-713f-49e8-99ee-76bb0c72006b',
    TIGER_FORCE: '5633fc6c-2f02-406a-9499-2c474e8224d1',
    KESARI_DHURANDARS: '7a7ec966-ee5f-4cc4-a7d8-d34a7d66fd5a',
    KOSAM_TIGER: 'd175b202-07c6-4c8a-91cb-1e5411f1eb44'
  };

  const schedule = [
    // ==========================================
    // DAY 1 — 10 October 2026 (6 League Matches)
    // ==========================================
    {
      match_date: '2026-10-10T09:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.PSB,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 1 • Day 1 • 9:00 AM - 10:00 AM'
    },
    {
      match_date: '2026-10-10T10:20:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.TIGER_FORCE,
      team2_id: TEAMS.KESARI_DHURANDARS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 2 • Day 1 • 10:20 AM - 11:20 AM'
    },
    {
      match_date: '2026-10-10T11:40:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 3 • Day 1 • 11:40 AM - 12:40 PM'
    },
    {
      match_date: '2026-10-10T13:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.TIGER_FORCE,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 4 • Day 1 • 1:00 PM - 2:00 PM'
    },
    {
      match_date: '2026-10-10T14:20:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.KESARI_DHURANDARS,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 5 • Day 1 • 2:20 PM - 3:20 PM'
    },
    {
      match_date: '2026-10-10T15:40:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.TIGER_FORCE,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 6 • Day 1 • 3:40 PM - 4:40 PM'
    },

    // ==========================================
    // DAY 2 — 11 October 2026 (4 League Matches + Semifinal)
    // ==========================================
    {
      match_date: '2026-10-11T09:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.KESARI_DHURANDARS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 7 • Day 2 • 9:00 AM - 10:00 AM'
    },
    {
      match_date: '2026-10-11T10:20:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.TIGER_FORCE,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 8 • Day 2 • 10:20 AM - 11:20 AM'
    },
    {
      match_date: '2026-10-11T11:40:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.KESARI_DHURANDARS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 9 • Day 2 • 11:40 AM - 12:40 PM'
    },
    {
      match_date: '2026-10-11T13:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 10 • Day 2 • 1:00 PM - 2:00 PM'
    },
    {
      match_date: '2026-10-11T14:30:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.TIGER_FORCE,
      status: 'upcoming',
      stage: 'semi_final_1',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'SEMIFINAL • Day 2 • 2:30 PM • #2 vs #3 (Winner advances to Final)'
    },

    // ==========================================
    // DAY 3 — 12 October 2026 (GRAND FINAL)
    // ==========================================
    {
      match_date: '2026-10-12T09:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.PSB,
      status: 'upcoming',
      stage: 'final',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'GRAND FINAL • Day 3 • 9:00 AM • #1 Team vs SF Winner'
    }
  ];

  console.log(`Inserting ${schedule.length} Season 2 matches...`);
  for (let i = 0; i < schedule.length; i++) {
    const m = schedule[i];
    const { data, error } = await supabase.from('matches').insert(m).select();
    if (error) {
      console.error(`Error inserting match ${i + 1}:`, error.message);
    } else {
      console.log(`✅ [Match ${i + 1}] Scheduled: ${m.result_desc} (ID: ${data[0].id})`);
    }
  }

  console.log('\n🎉 ALL 12 SEASON 2 MATCHES SUCCESSFULLY SCHEDULED!');
}

run();

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

  // Remove any existing October 2026 matches for clean schedule setup
  const { data: existingOct } = await supabase.from('matches').select('id').gte('match_date', '2026-10-01');
  if (existingOct && existingOct.length > 0) {
    console.log(`Removing ${existingOct.length} existing October matches for clean setup...`);
    for (const m of existingOct) {
      await supabase.from('matches').delete().eq('id', m.id);
    }
  }

  // Exact Team IDs from Supabase Database
  // 6 Teams: 1. SBI Kosam, 2. PSB, 3. Tiger Force, 4. Kesari Dhurandars, 5. Kosam Tiger, 6. DSS
  const TEAMS = {
    SBI_KOSAM: 'eac15202-8402-41f6-9696-59a2b3fe55ca',
    PSB: '4c01d61c-713f-49e8-99ee-76bb0c72006b',
    TIGER_FORCE: '5633fc6c-2f02-406a-9499-2c474e8224d1',
    KESARI_DHURANDARS: '7a7ec966-ee5f-4cc4-a7d8-d34a7d66fd5a',
    KOSAM_TIGER: 'd175b202-07c6-4c8a-91cb-1e5411f1eb44',
    DSS: 'd5bdbad5-9c50-4d5e-a6a6-9e41a907bbbe'
  };

  const schedule = [
    // =========================================================================
    // DAY 1 — 10 October 2026 (8 League Matches | 9:00 AM – 6:20 PM)
    // =========================================================================
    // Match 1: 9:00 AM – 10:00 AM | SBI Kosam vs PSB (10:00 – 10:10 AM 10 min Break)
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
    // Match 2: 10:10 AM – 11:10 AM | Tiger Force vs Kesari Dhurandars (11:10 – 11:20 AM 10 min Break)
    {
      match_date: '2026-10-10T10:10:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.TIGER_FORCE,
      team2_id: TEAMS.KESARI_DHURANDARS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 2 • Day 1 • 10:10 AM - 11:10 AM'
    },
    // Match 3: 11:20 AM – 12:20 PM | SBI Kosam vs Kosam Tiger (12:20 – 12:40 PM Lunch Break)
    {
      match_date: '2026-10-10T11:20:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 3 • Day 1 • 11:20 AM - 12:20 PM'
    },
    // Match 4: 12:40 PM – 1:40 PM | PSB vs DSS (1:40 – 1:50 PM 10 min Break)
    {
      match_date: '2026-10-10T12:40:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.DSS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 4 • Day 1 • 12:40 PM - 1:40 PM'
    },
    // Match 5: 1:50 PM – 2:50 PM | Tiger Force vs Kosam Tiger (2:50 – 3:00 PM 10 min Break)
    {
      match_date: '2026-10-10T13:50:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.TIGER_FORCE,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 5 • Day 1 • 1:50 PM - 2:50 PM'
    },
    // Match 6: 3:00 PM – 4:00 PM | SBI Kosam vs Kesari Dhurandars (4:00 – 4:10 PM 10 min Break)
    {
      match_date: '2026-10-10T15:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.KESARI_DHURANDARS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 6 • Day 1 • 3:00 PM - 4:00 PM'
    },
    // Match 7: 4:10 PM – 5:10 PM | PSB vs Tiger Force (5:10 – 5:20 PM 10 min Break)
    {
      match_date: '2026-10-10T16:10:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.TIGER_FORCE,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 7 • Day 1 • 4:10 PM - 5:10 PM'
    },
    // Match 8: 5:20 PM – 6:20 PM | Kesari Dhurandars vs DSS
    {
      match_date: '2026-10-10T17:20:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.KESARI_DHURANDARS,
      team2_id: TEAMS.DSS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 8 • Day 1 • 5:20 PM - 6:20 PM'
    },

    // =========================================================================
    // DAY 2 — 11 October 2026 (7 League Matches | 9:00 AM – 5:10 PM)
    // =========================================================================
    // Match 9: 9:00 AM – 10:00 AM | SBI Kosam vs Tiger Force (10:00 – 10:10 AM 10 min Break)
    {
      match_date: '2026-10-11T09:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.TIGER_FORCE,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 9 • Day 2 • 9:00 AM - 10:00 AM'
    },
    // Match 10: 10:10 AM – 11:10 AM | PSB vs Kosam Tiger (11:10 – 11:20 AM 10 min Break)
    {
      match_date: '2026-10-11T10:10:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 10 • Day 2 • 10:10 AM - 11:10 AM'
    },
    // Match 11: 11:20 AM – 12:20 PM | Tiger Force vs DSS (12:20 – 12:40 PM Lunch Break)
    {
      match_date: '2026-10-11T11:20:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.TIGER_FORCE,
      team2_id: TEAMS.DSS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 11 • Day 2 • 11:20 AM - 12:20 PM'
    },
    // Match 12: 12:40 PM – 1:40 PM | Kesari Dhurandars vs Kosam Tiger (1:40 – 1:50 PM 10 min Break)
    {
      match_date: '2026-10-11T12:40:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.KESARI_DHURANDARS,
      team2_id: TEAMS.KOSAM_TIGER,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 12 • Day 2 • 12:40 PM - 1:40 PM'
    },
    // Match 13: 1:50 PM – 2:50 PM | SBI Kosam vs DSS (2:50 – 3:00 PM 10 min Break)
    {
      match_date: '2026-10-11T13:50:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.SBI_KOSAM,
      team2_id: TEAMS.DSS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 13 • Day 2 • 1:50 PM - 2:50 PM'
    },
    // Match 14: 3:00 PM – 4:00 PM | PSB vs Kesari Dhurandars (4:00 – 4:10 PM 10 min Break)
    {
      match_date: '2026-10-11T15:00:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.PSB,
      team2_id: TEAMS.KESARI_DHURANDARS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 14 • Day 2 • 3:00 PM - 4:00 PM'
    },
    // Match 15: 4:10 PM – 5:10 PM | Kosam Tiger vs DSS (Final League Match)
    {
      match_date: '2026-10-11T16:10:00+05:30',
      venue: 'Kosam Ground',
      team1_id: TEAMS.KOSAM_TIGER,
      team2_id: TEAMS.DSS,
      status: 'upcoming',
      stage: 'league',
      overs_limit: 8,
      players_count: 11,
      result_desc: 'Match 15 • Day 2 • 4:10 PM - 5:10 PM'
    }
  ];

  console.log(`Inserting ${schedule.length} Season 2 League matches...`);
  const { data: inserted, error: insertError } = await supabase.from('matches').insert(schedule).select();
  if (insertError) {
    console.error('Failed to insert matches:', insertError);
    process.exit(1);
  }

  console.log(`Successfully scheduled ${inserted.length} Season 2 matches according to official KPL Season 2 Schedule PDF!`);
  console.log('Day 1 (10 Oct): 8 Matches');
  console.log('Day 2 (11 Oct): 7 Matches');
  console.log('Day 3 (12 Oct): Semifinal (#2 vs #3 at 9:00 AM) & Grand Final (#1 vs SF Winner at 12:00 PM) will be unlocked after League Stage.');
}

run();

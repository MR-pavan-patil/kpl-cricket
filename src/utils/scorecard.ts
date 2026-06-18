import { BallLogEvent, Player } from '@/types'

export interface BatsmanScorecardEntry {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  howOut: string;
  isOut: boolean;
}

export interface BowlerScorecardEntry {
  playerId: string;
  name: string;
  overs: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  balls: number;
}

export interface FOWEntry {
  wicketNumber: number;
  score: number;
  wickets: number;
  overs: string;
  batsmanName: string;
}

export interface PartnershipEntry {
  batsman1Id: string;
  batsman1Name: string;
  batsman1Runs: number;
  batsman2Id: string;
  batsman2Name: string;
  batsman2Runs: number;
  totalRuns: number;
  totalBalls: number;
}

export interface InningsScorecard {
  batting: BatsmanScorecardEntry[];
  bowling: BowlerScorecardEntry[];
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  overs: string;
  fow: FOWEntry[];
  partnerships: PartnershipEntry[];
}

export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6)
  const remainingBalls = balls % 6
  return `${overs}.${remainingBalls}`
}

export function calculateScorecard(
  ballsLog: BallLogEvent[],
  players: Player[],
  inningsNumber: number
): InningsScorecard {
  const playersMap = new Map<string, Player>()
  players.forEach((p) => playersMap.set(p.id, p))

  const inningsBalls = (ballsLog || []).filter((b) => b.innings === inningsNumber)

  // Initialize scorecard builders
  const battingMap = new Map<string, BatsmanScorecardEntry>()
  const bowlingMap = new Map<string, BowlerScorecardEntry>()
  const fow: FOWEntry[] = []
  const partnerships: PartnershipEntry[] = []

  let totalRuns = 0
  let totalWickets = 0
  let totalBalls = 0

  let wides = 0
  let noBalls = 0
  let byes = 0
  let legByes = 0

  // Batting order list to preserve the order in which batsmen come to bat
  const battingOrder: string[] = []

  // Helper to ensure batsman is in the scorecard
  const getOrCreateBatsman = (id: string): BatsmanScorecardEntry => {
    if (!battingMap.has(id)) {
      const p = playersMap.get(id)
      const entry: BatsmanScorecardEntry = {
        playerId: id,
        name: p?.name || 'Unknown Batsman',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        howOut: 'not out',
        isOut: false,
      }
      battingMap.set(id, entry)
      battingOrder.push(id)
    }
    return battingMap.get(id)!
  }

  // Helper to ensure bowler is in the scorecard
  const getOrCreateBowler = (id: string): BowlerScorecardEntry => {
    if (!bowlingMap.has(id)) {
      const p = playersMap.get(id)
      const entry: BowlerScorecardEntry = {
        playerId: id,
        name: p?.name || 'Unknown Bowler',
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0.0,
        balls: 0,
      }
      bowlingMap.set(id, entry)
    }
    return bowlingMap.get(id)!
  }

  // Track the current over details for maidens calculation
  interface CurrentOverBall {
    runsConceded: number;
    isLegal: boolean;
  }
  let currentOverBalls: CurrentOverBall[] = []

  // Track active partnership
  let pshipRuns = 0
  let pshipBalls = 0
  let pshipBatsman1Id = ''
  let pshipBatsman2Id = ''
  let pship1Runs = 0
  let pship2Runs = 0

  const resetPartnership = (b1: string, b2: string) => {
    pshipRuns = 0
    pshipBalls = 0
    pshipBatsman1Id = b1
    pshipBatsman2Id = b2
    pship1Runs = 0
    pship2Runs = 0
  }

  // Process ball by ball
  inningsBalls.forEach((ball) => {
    // 1. Resolve active batsmen and bowler
    const striker = getOrCreateBatsman(ball.striker_id)
    const nonStriker = getOrCreateBatsman(ball.non_striker_id)
    const bowler = getOrCreateBowler(ball.bowler_id)

    // Set up partnership if not initialized
    if (!pshipBatsman1Id || !pshipBatsman2Id) {
      resetPartnership(ball.striker_id, ball.non_striker_id)
    }

    // Determine runs and extra details
    const isWide = ball.extra_type === 'wide'
    const isNb = ball.extra_type === 'no_ball'
    const isBye = ball.extra_type === 'bye'
    const isLb = ball.extra_type === 'leg_bye'

    // Update team runs
    const ballTeamRuns = ball.runs + ball.extra_runs
    totalRuns += ballTeamRuns

    // Update extras
    if (isWide) wides += ball.extra_runs
    if (isNb) noBalls += ball.extra_runs
    if (isBye) byes += ball.extra_runs
    if (isLb) legByes += ball.extra_runs

    // Update batsman stats
    const facingBatsman = getOrCreateBatsman(ball.batsman_id)
    if (!isWide) {
      facingBatsman.runs += ball.runs
      facingBatsman.balls += 1
      if (ball.runs === 4) facingBatsman.fours += 1
      if (ball.runs === 6) facingBatsman.sixes += 1
    }

    // Update partnership
    pshipRuns += ballTeamRuns
    if (ball.is_legal) {
      pshipBalls += 1
    }
    if (ball.batsman_id === pshipBatsman1Id && !isWide) {
      pship1Runs += ball.runs
    } else if (ball.batsman_id === pshipBatsman2Id && !isWide) {
      pship2Runs += ball.runs
    }

    // Update bowler runs conceded
    // Bowler concedes runs off the bat + wide + no ball runs
    let bowlerRunsConceded = ball.runs
    if (isWide || isNb) {
      bowlerRunsConceded += ball.extra_runs
    }
    bowler.runsConceded += bowlerRunsConceded

    // Update ball counts
    if (ball.is_legal) {
      totalBalls += 1
      bowler.balls += 1
    }

    // Keep track of bowler's current over
    currentOverBalls.push({
      runsConceded: bowlerRunsConceded,
      isLegal: ball.is_legal,
    })

    // Wicket handling
    if (ball.is_wicket) {
      totalWickets += 1
      
      // Bowler gets wicket if it's not a run out or retired hurt
      const isBowlerWicket = ball.wicket_type && ['bowled', 'caught', 'lbw', 'stumped'].includes(ball.wicket_type)
      if (isBowlerWicket) {
        bowler.wickets += 1
      }

      // Who got out?
      const outBatsmanId = ball.dismissed_batsman_id || ball.batsman_id
      const outBatsman = getOrCreateBatsman(outBatsmanId)
      outBatsman.isOut = true

      // Formulate dismissal text
      const bowlerName = playersMap.get(ball.bowler_id)?.name || 'Bowler'
      if (ball.wicket_type === 'bowled') {
        outBatsman.howOut = `b ${bowlerName}`
      } else if (ball.wicket_type === 'caught') {
        outBatsman.howOut = `c Field b ${bowlerName}` // We don't track fielder name, keep general
      } else if (ball.wicket_type === 'lbw') {
        outBatsman.howOut = `lbw b ${bowlerName}`
      } else if (ball.wicket_type === 'stumped') {
        outBatsman.howOut = `st b ${bowlerName}`
      } else if (ball.wicket_type === 'run_out') {
        outBatsman.howOut = `run out`
      } else if (ball.wicket_type === 'retired_hurt') {
        outBatsman.howOut = `retired hurt`
        outBatsman.isOut = false // retired hurt doesn't count against bowler, batsman not technically out in same way, but can't bat
      } else {
        outBatsman.howOut = `out b ${bowlerName}`
      }

      // Record FOW
      fow.push({
        wicketNumber: totalWickets,
        score: totalRuns,
        wickets: totalWickets,
        overs: formatOvers(totalBalls),
        batsmanName: outBatsman.name,
      })

      // Record Partnership
      partnerships.push({
        batsman1Id: pshipBatsman1Id,
        batsman1Name: playersMap.get(pshipBatsman1Id)?.name || 'Unknown',
        batsman1Runs: pship1Runs,
        batsman2Id: pshipBatsman2Id,
        batsman2Name: playersMap.get(pshipBatsman2Id)?.name || 'Unknown',
        batsman2Runs: pship2Runs,
        totalRuns: pshipRuns,
        totalBalls: pshipBalls,
      })

      // Reset partnership with the survivor and a placeholder for the next batsman (will be reset next ball)
      const survivorId = outBatsmanId === pshipBatsman1Id ? pshipBatsman2Id : pshipBatsman1Id
      resetPartnership(survivorId, '')
    }

    // Check if over completed (6 legal balls in currentOverBalls)
    const legalBallsInOver = currentOverBalls.filter((cb) => cb.isLegal).length
    if (legalBallsInOver === 6) {
      // Check for maiden
      const overRuns = currentOverBalls.reduce((sum, cb) => sum + cb.runsConceded, 0)
      if (overRuns === 0) {
        bowler.maidens += 1
      }
      currentOverBalls = []
    }
  })

  // Add final active partnership if the innings ended but there are active batsmen
  if (pshipBatsman1Id && pshipBatsman2Id && pshipBatsman2Id !== '') {
    partnerships.push({
      batsman1Id: pshipBatsman1Id,
      batsman1Name: playersMap.get(pshipBatsman1Id)?.name || 'Unknown',
      batsman1Runs: pship1Runs,
      batsman2Id: pshipBatsman2Id,
      batsman2Name: playersMap.get(pshipBatsman2Id)?.name || 'Unknown',
      batsman2Runs: pship2Runs,
      totalRuns: pshipRuns,
      totalBalls: pshipBalls,
    })
  }

  // Calculate Strike Rates
  const batting = battingOrder.map((id) => {
    const entry = battingMap.get(id)!
    entry.strikeRate = entry.balls > 0 ? parseFloat(((entry.runs / entry.balls) * 100).toFixed(2)) : 0.0
    return entry
  })

  // Calculate Bowler Overs and Economy
  const bowling = Array.from(bowlingMap.values()).map((b) => {
    b.overs = formatOvers(b.balls)
    const overFraction = Math.floor(b.balls / 6) + (b.balls % 6) / 6
    b.economy = overFraction > 0 ? parseFloat((b.runsConceded / overFraction).toFixed(2)) : 0.0
    return b
  })

  const totalExtras = wides + noBalls + byes + legByes

  return {
    batting,
    bowling,
    extras: {
      wides,
      noBalls,
      byes,
      legByes,
      total: totalExtras,
    },
    totalRuns,
    totalWickets,
    totalBalls,
    overs: formatOvers(totalBalls),
    fow,
    partnerships,
  }
}

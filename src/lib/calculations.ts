import { Decimal } from '@prisma/client/runtime/library';

export type PracticeWithAttendance = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  notes: string | null;
  attendances: {
    id: string;
    playerId: string | null;
    adHocName: string | null;
    type: string;
    confirmed: boolean;
    adHocFee: Decimal | null;
  }[];
};

export type PlayerBalance = {
  playerId: string;
  playerName: string;
  practicesAttended: number;
  totalCostOwed: number;
  totalDeposits: number;
  balance: number; // positive = credit, negative = owes
};

export type PracticeCostInfo = {
  practiceId: string;
  date: Date;
  location: string;
  status: string;
  startTime: string;
  endTime: string;
  permanentAttendeeCount: number;
  adHocCount: number;
  costPerPractice: number;
  costPerPlayer: number;
};

export function computeSeasonStats(
  practices: PracticeWithAttendance[],
  seasonPlayers: { playerId: string; player: { id: string; name: string }; active: boolean }[],
  deposits: { playerId: string; amount: Decimal }[],
  estimatedRentalCost: Decimal
) {
  // Total planned practices = all non-cancelled practices
  const plannedPractices = practices.filter(p => p.status !== 'cancelled');
  const totalPlanned = plannedPractices.length;

  // estimatedRentalCost is the per-practice rental cost; total is derived from non-cancelled count
  const costPerPractice = Number(estimatedRentalCost);
  const totalEstimatedRental = costPerPractice * totalPlanned;

  // Build practice cost info
  const practiceCosts: PracticeCostInfo[] = practices.map(practice => {
    const permanentAttendees = practice.attendances.filter(
      a => a.type === 'PERMANENT' && a.confirmed
    );
    const adHocAttendees = practice.attendances.filter(a => a.type === 'ADHOC');
    const permanentCount = permanentAttendees.length;

    let costPerPlayer = 0;
    if (practice.status !== 'cancelled' && permanentCount > 0) {
      costPerPlayer = costPerPractice / permanentCount;
    }

    return {
      practiceId: practice.id,
      date: practice.date,
      location: practice.location,
      status: practice.status,
      startTime: practice.startTime,
      endTime: practice.endTime,
      permanentAttendeeCount: permanentCount,
      adHocCount: adHocAttendees.length,
      costPerPractice,
      costPerPlayer,
    };
  });

  // Build player balances
  const depositsByPlayer = new Map<string, number>();
  for (const deposit of deposits) {
    const existing = depositsByPlayer.get(deposit.playerId) || 0;
    depositsByPlayer.set(deposit.playerId, existing + Number(deposit.amount));
  }

  const playerBalances: PlayerBalance[] = seasonPlayers.map(sp => {
    const playerPractices = practices.filter(practice => {
      if (practice.status === 'cancelled') return false;
      return practice.attendances.some(
        a => a.playerId === sp.playerId && a.type === 'PERMANENT' && a.confirmed
      );
    });

    const totalCostOwed = playerPractices.reduce((sum, practice) => {
      const info = practiceCosts.find(pc => pc.practiceId === practice.id);
      return sum + (info?.costPerPlayer || 0);
    }, 0);

    const totalDeposits = depositsByPlayer.get(sp.playerId) || 0;

    return {
      playerId: sp.playerId,
      playerName: sp.player.name,
      practicesAttended: playerPractices.length,
      totalCostOwed,
      totalDeposits,
      balance: totalDeposits - totalCostOwed,
    };
  });

  return { practiceCosts, playerBalances, costPerPractice, totalEstimatedRental };
}

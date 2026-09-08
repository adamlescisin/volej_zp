import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { computeSeasonStats } from '@/lib/calculations';
import { formatCZK, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function statusLabel(status: string) {
  if (status === 'completed') return 'Odehráno';
  if (status === 'cancelled') return 'Zrušeno';
  return 'Naplánováno';
}

export default async function SeasonDetailPage({ params }: { params: { id: string } }) {
  const season = await prisma.season.findUnique({
    where: { id: params.id },
    include: {
      seasonPlayers: {
        include: { player: true },
        where: { active: true },
      },
      practices: {
        include: {
          attendances: true,
        },
        orderBy: { date: 'asc' },
      },
      deposits: true,
      rentalCosts: true,
    },
  });

  if (!season) notFound();

  const { practiceCosts, playerBalances, costPerPractice } = computeSeasonStats(
    season.practices,
    season.seasonPlayers,
    season.deposits,
    season.estimatedRentalCost
  );

  const totalDeposits = season.deposits.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalActualCosts = season.rentalCosts.reduce((sum, c) => sum + Number(c.amount), 0);
  const heldPractices = season.practices.filter(p => p.status === 'completed' || p.status === 'scheduled').length;
  const cancelledPractices = season.practices.filter(p => p.status === 'cancelled').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white py-4 px-4 shadow">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-blue-200 hover:text-white text-sm">← Domů</Link>
          <div>
            <h1 className="text-xl font-bold">{season.name}</h1>
            <p className="text-blue-200 text-sm">{formatDate(season.startDate)} – {formatDate(season.endDate)}</p>
          </div>
          {season.isActive && (
            <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">Aktivní</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Přehled sezóny */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Odhadovaný rozpočet</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(Number(season.estimatedRentalCost))}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Skutečné náklady</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(totalActualCosts)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Celkem zálohy</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(totalDeposits)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Tréninky</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {heldPractices} <span className="text-sm font-normal text-gray-500">/ {season.practices.length}</span>
            </div>
            {cancelledPractices > 0 && (
              <div className="text-xs text-red-500">{cancelledPractices} zrušeno</div>
            )}
          </div>
        </div>

        {/* Zůstatky hráčů */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Zůstatky hráčů</h2>
          {playerBalances.length === 0 ? (
            <p className="text-gray-500 text-sm">Žádní hráči v této sezóně.</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Hráč</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Tréninky</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Dluh</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Zálohy</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Zůstatek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {playerBalances.map(pb => (
                    <tr key={pb.playerId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{pb.playerName}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{pb.practicesAttended}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCZK(pb.totalCostOwed)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCZK(pb.totalDeposits)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${pb.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pb.balance >= 0 ? '+' : ''}{formatCZK(pb.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Seznam tréninků */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Tréninky
            <span className="ml-2 text-sm font-normal text-gray-500">
              Náklady na trénink: {formatCZK(costPerPractice)}
            </span>
          </h2>
          {practiceCosts.length === 0 ? (
            <p className="text-gray-500 text-sm">Žádné tréninky naplánovány.</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Datum</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Místo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Čas</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Účastníci</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Náklady/hráč</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Stav</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {practiceCosts.map(pc => (
                    <tr key={pc.practiceId} className={`hover:bg-gray-50 ${pc.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-900">{formatDate(pc.date)}</td>
                      <td className="px-4 py-3 text-gray-600">{pc.location}</td>
                      <td className="px-4 py-3 text-gray-600">{pc.startTime}–{pc.endTime}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {pc.permanentAttendeeCount}
                        {pc.adHocCount > 0 && (
                          <span className="text-xs text-blue-500 ml-1">+{pc.adHocCount} náhr.</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {pc.status !== 'cancelled' ? formatCZK(pc.costPerPlayer) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          pc.status === 'completed' ? 'bg-green-100 text-green-700' :
                          pc.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {statusLabel(pc.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

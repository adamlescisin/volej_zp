import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { formatDate, formatCZK } from '@/lib/utils';
import { createDepositAction, deleteDepositAction } from './actions';

export const dynamic = 'force-dynamic';
export default async function DepositsPage({
  searchParams,
}: {
  searchParams: { seasonId?: string };
}) {
  const seasons = await prisma.season.findMany({ orderBy: { startDate: 'desc' } });
  const selectedSeasonId = searchParams.seasonId || seasons.find(s => s.isActive)?.id;

  const seasonPlayers = selectedSeasonId
    ? await prisma.seasonPlayer.findMany({
        where: { seasonId: selectedSeasonId, active: true },
        include: { player: true },
        orderBy: { player: { name: 'asc' } },
      })
    : [];

  const deposits = selectedSeasonId
    ? await prisma.deposit.findMany({
        where: { seasonId: selectedSeasonId },
        include: { player: true },
        orderBy: { date: 'desc' },
      })
    : [];

  // Ad-hoc fees from practices in this season
  const adHocAttendances = selectedSeasonId
    ? await prisma.attendance.findMany({
        where: {
          type: 'ADHOC',
          adHocFee: { not: null },
          practice: { seasonId: selectedSeasonId },
        },
        include: { practice: true },
        orderBy: { practice: { date: 'desc' } },
      })
    : [];

  // Non-cancelled practice count for estimated total calculation
  const nonCancelledPracticeCount = selectedSeasonId
    ? await prisma.practice.count({
        where: { seasonId: selectedSeasonId, status: { not: 'cancelled' } },
      })
    : 0;

  // Actual rental costs for reconciliation
  const rentalCosts = selectedSeasonId
    ? await prisma.rentalCost.findMany({
        where: { seasonId: selectedSeasonId },
      })
    : [];

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  const totalDeposits = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const totalAdHocFees = adHocAttendances.reduce((s, a) => s + (a.adHocFee ? Number(a.adHocFee) : 0), 0);
  const totalPokladna = totalDeposits + totalAdHocFees;

  const estimatedRental = selectedSeason ? Number(selectedSeason.estimatedRentalCost) * nonCancelledPracticeCount : 0;
  const actualRental = rentalCosts.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pokladna</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/deposits" />
      </div>

      {selectedSeasonId ? (
        <>
          {/* Summary cards */}
          {selectedSeason && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Zálohy hráčů</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(totalDeposits)}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Příjmy za náhradníky</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(totalAdHocFees)}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 border-blue-200 bg-blue-50">
                <div className="text-sm text-blue-700 font-medium">Celkem v pokladně</div>
                <div className="text-xl font-bold text-blue-800 mt-1">{formatCZK(totalPokladna)}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Zůstatek po nájmu</div>
                {actualRental > 0 ? (
                  <div className={`text-xl font-bold mt-1 ${totalPokladna - actualRental >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCZK(totalPokladna - actualRental)}
                    <div className="text-xs font-normal text-gray-500 mt-0.5">po skutečném nájmu</div>
                  </div>
                ) : (
                  <div className={`text-xl font-bold mt-1 ${totalPokladna - estimatedRental >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCZK(totalPokladna - estimatedRental)}
                    <div className="text-xs font-normal text-gray-500 mt-0.5">po odhadovaném nájmu</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rental reconciliation bar */}
          {selectedSeason && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 text-sm">
              <div className="font-medium text-gray-700 mb-2">Porovnání s nájmem</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Pokladna</span>
                  <span className="font-semibold text-blue-700">{formatCZK(totalPokladna)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Odhadovaný nájem</span>
                  <span className="font-medium text-gray-700">{formatCZK(estimatedRental)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Skutečný nájem</span>
                  <span className="font-medium text-gray-700">
                    {actualRental > 0 ? formatCZK(actualRental) : '—'}
                  </span>
                </div>
                {actualRental > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Odchylka nájmu</span>
                    <span className={`font-medium ${actualRental > estimatedRental ? 'text-red-600' : 'text-green-600'}`}>
                      {actualRental > estimatedRental ? '+' : ''}{formatCZK(actualRental - estimatedRental)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Log deposit form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Zapsat zálohu hráče</h2>
            <form action={createDepositAction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input type="hidden" name="seasonId" value={selectedSeasonId} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hráč</label>
                <select
                  name="playerId"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Vyberte hráče…</option>
                  {seasonPlayers.map(sp => (
                    <option key={sp.playerId} value={sp.playerId}>{sp.player.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Částka (Kč)</label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="100"
                  required
                  placeholder="např. 2000"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka (nepovinné)</label>
                <input
                  name="note"
                  type="text"
                  placeholder="např. Hotovost"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Zapsat zálohu
                </button>
              </div>
            </form>
          </div>

          {/* Deposits table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">
                Zálohy hráčů ({deposits.length})
              </h2>
              <span className="text-lg font-bold text-green-700">{formatCZK(totalDeposits)}</span>
            </div>
            {deposits.length === 0 ? (
              <p className="text-gray-500 text-sm p-6">Žádné zálohy pro tuto sezónu.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Datum</th>
                    <th className="text-left px-6 py-3 font-medium">Hráč</th>
                    <th className="text-right px-6 py-3 font-medium">Částka</th>
                    <th className="text-left px-6 py-3 font-medium">Poznámka</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deposits.map(deposit => (
                    <tr key={deposit.id}>
                      <td className="px-6 py-3 text-gray-600">{formatDate(deposit.date)}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{deposit.player.name}</td>
                      <td className="px-6 py-3 text-right font-medium text-green-700">
                        {formatCZK(Number(deposit.amount))}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{deposit.note || '—'}</td>
                      <td className="px-6 py-3 text-right">
                        <form action={deleteDepositAction.bind(null, deposit.id)}>
                          <button type="submit" className="text-red-400 hover:text-red-600 text-xs">
                            Smazat
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Ad-hoc fees table */}
          {adHocAttendances.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">
                  Příjmy za náhradníky ({adHocAttendances.length})
                </h2>
                <span className="text-lg font-bold text-green-700">{formatCZK(totalAdHocFees)}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Trénink</th>
                    <th className="text-left px-6 py-3 font-medium">Náhradník</th>
                    <th className="text-right px-6 py-3 font-medium">Poplatek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adHocAttendances.map(a => (
                    <tr key={a.id}>
                      <td className="px-6 py-3 text-gray-600">{formatDate(a.practice.date)}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{a.adHocName}</td>
                      <td className="px-6 py-3 text-right font-medium text-green-700">
                        {a.adHocFee ? formatCZK(Number(a.adHocFee)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500">Prosím vyberte sezónu.</p>
      )}
    </AdminLayout>
  );
}

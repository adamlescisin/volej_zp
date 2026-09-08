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

  const totalDeposits = deposits.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Zálohy</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/deposits" />
      </div>

      {selectedSeasonId ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Zapsat zálohu</h2>
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

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">
                {deposits.length} {deposits.length === 1 ? 'záloha' : deposits.length < 5 ? 'zálohy' : 'záloh'}
              </h2>
              <span className="text-lg font-bold text-green-700">{formatCZK(totalDeposits)} celkem</span>
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
        </>
      ) : (
        <p className="text-gray-500">Prosím vyberte sezónu.</p>
      )}
    </AdminLayout>
  );
}

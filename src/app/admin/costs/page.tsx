import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { formatDate, formatCZK } from '@/lib/utils';
import { createRentalCostAction, deleteRentalCostAction } from './actions';

export const dynamic = 'force-dynamic';
export default async function CostsPage({
  searchParams,
}: {
  searchParams: { seasonId?: string };
}) {
  const seasons = await prisma.season.findMany({ orderBy: { startDate: 'desc' } });
  const selectedSeasonId = searchParams.seasonId || seasons.find(s => s.isActive)?.id;

  const practices = selectedSeasonId
    ? await prisma.practice.findMany({
        where: { seasonId: selectedSeasonId },
        orderBy: { date: 'asc' },
      })
    : [];

  const rentalCosts = selectedSeasonId
    ? await prisma.rentalCost.findMany({
        where: { seasonId: selectedSeasonId },
        include: { practice: true },
        orderBy: { date: 'desc' },
      })
    : [];

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
  const totalActual = rentalCosts.reduce((s, c) => s + Number(c.amount), 0);
  const nonCancelledCount = practices.filter(p => p.status !== 'cancelled').length;
  const estimatedTotal = selectedSeason ? Number(selectedSeason.estimatedRentalCost) * nonCancelledCount : 0;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Náklady na nájem</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/costs" />
      </div>

      {selectedSeasonId ? (
        <>
          {selectedSeason && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Odhadovaný celkový nájem</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(estimatedTotal)}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Skutečné náklady</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(totalActual)}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Odchylka</div>
                <div className={`text-xl font-bold mt-1 ${totalActual > estimatedTotal ? 'text-red-600' : 'text-green-600'}`}>
                  {totalActual > estimatedTotal ? '+' : ''}{formatCZK(totalActual - estimatedTotal)}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Zapsat náklady na nájem</h2>
            <form action={createRentalCostAction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input type="hidden" name="seasonId" value={selectedSeasonId} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Částka (Kč)</label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="100"
                  required
                  placeholder="např. 800"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propojit s tréninkem (nepovinné)</label>
                <select
                  name="practiceId"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Žádný —</option>
                  {practices.map(p => (
                    <option key={p.id} value={p.id}>
                      {formatDate(p.date)} — {p.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dodavatel (nepovinné)</label>
                <input
                  name="vendor"
                  type="text"
                  placeholder="např. Sportovní hala A"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka (nepovinné)</label>
                <input
                  name="note"
                  type="text"
                  placeholder="Č. faktury, atd."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Zapsat náklady
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                {rentalCosts.length} {rentalCosts.length === 1 ? 'záznam nákladů' : rentalCosts.length < 5 ? 'záznamy nákladů' : 'záznamů nákladů'}
              </h2>
            </div>
            {rentalCosts.length === 0 ? (
              <p className="text-gray-500 text-sm p-6">Žádné náklady pro tuto sezónu.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Datum</th>
                    <th className="text-right px-6 py-3 font-medium">Částka</th>
                    <th className="text-left px-6 py-3 font-medium">Trénink</th>
                    <th className="text-left px-6 py-3 font-medium">Dodavatel</th>
                    <th className="text-left px-6 py-3 font-medium">Poznámka</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rentalCosts.map(cost => (
                    <tr key={cost.id}>
                      <td className="px-6 py-3 text-gray-600">{formatDate(cost.date)}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatCZK(Number(cost.amount))}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {cost.practice ? formatDate(cost.practice.date) : '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{cost.vendor || '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{cost.note || '—'}</td>
                      <td className="px-6 py-3 text-right">
                        <form action={deleteRentalCostAction.bind(null, cost.id)}>
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

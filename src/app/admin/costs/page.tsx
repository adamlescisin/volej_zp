import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { formatDate, formatCZK } from '@/lib/utils';
import { createRentalCostAction, deleteRentalCostAction } from './actions';

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
  const estimatedTotal = selectedSeason ? Number(selectedSeason.estimatedRentalCost) : 0;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rental Costs</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/costs" />
      </div>

      {selectedSeasonId ? (
        <>
          {selectedSeason && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Estimated Total</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(estimatedTotal)}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Actual Costs Logged</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{formatCZK(totalActual)}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Variance</div>
                <div className={`text-xl font-bold mt-1 ${totalActual > estimatedTotal ? 'text-red-600' : 'text-green-600'}`}>
                  {totalActual > estimatedTotal ? '+' : ''}{formatCZK(totalActual - estimatedTotal)}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Log Rental Cost</h2>
            <form action={createRentalCostAction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input type="hidden" name="seasonId" value={selectedSeasonId} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (CZK)</label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="100"
                  required
                  placeholder="e.g. 800"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Practice (optional)</label>
                <select
                  name="practiceId"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— None —</option>
                  {practices.map(p => (
                    <option key={p.id} value={p.id}>
                      {formatDate(p.date)} — {p.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor (optional)</label>
                <input
                  name="vendor"
                  type="text"
                  placeholder="e.g. Sports Hall A"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  name="note"
                  type="text"
                  placeholder="Invoice #, etc."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Log Cost
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{rentalCosts.length} cost record{rentalCosts.length !== 1 ? 's' : ''}</h2>
            </div>
            {rentalCosts.length === 0 ? (
              <p className="text-gray-500 text-sm p-6">No costs logged for this season.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Date</th>
                    <th className="text-right px-6 py-3 font-medium">Amount</th>
                    <th className="text-left px-6 py-3 font-medium">Practice</th>
                    <th className="text-left px-6 py-3 font-medium">Vendor</th>
                    <th className="text-left px-6 py-3 font-medium">Note</th>
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
                            Delete
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
        <p className="text-gray-500">Please select a season.</p>
      )}
    </AdminLayout>
  );
}

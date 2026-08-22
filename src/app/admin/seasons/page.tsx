import { prisma } from '@/lib/prisma';
import { formatDate, formatCZK, formatDateInput } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SeasonsPage() {
  const seasons = await prisma.season.findMany({ orderBy: { startDate: 'desc' } });

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Seasons</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New Season</h2>
        <form action={createSeasonAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Season Name</label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Autumn 2026"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Total Rental (CZK)</label>
            <input
              name="estimatedRentalCost"
              type="number"
              min="0"
              step="100"
              required
              placeholder="e.g. 15000"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              name="startDate"
              type="date"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              name="endDate"
              type="date"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Create Season
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {seasons.map(season => (
          <div
            key={season.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">{season.name}</h3>
                {season.isActive && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formatDate(season.startDate)} – {formatDate(season.endDate)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Estimated rental: <strong>{formatCZK(Number(season.estimatedRentalCost))}</strong>
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <form
                action={async () => {
                  'use server';
                  await toggleSeasonActiveAction(season.id, !season.isActive);
                }}
              >
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    season.isActive
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {season.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            </div>
          </div>
        ))}
        {seasons.length === 0 && (
          <p className="text-gray-500 text-center py-8">No seasons yet. Create one above.</p>
        )}
      </div>
    </AdminLayout>
  );
}

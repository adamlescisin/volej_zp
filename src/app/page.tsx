import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate, formatCZK } from '@/lib/utils';

export default async function HomePage() {
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      _count: {
        select: { practices: true, seasonPlayers: true },
      },
    },
  });

  const activeSeason = seasons.find(s => s.isActive);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white py-6 px-4 shadow">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ZP Volej Tracker</h1>
            <p className="text-blue-200 text-sm mt-1">Volleyball attendance &amp; cost tracking</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="bg-white text-blue-700 px-4 py-2 rounded font-medium text-sm hover:bg-blue-50 transition"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeSeason && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                Active
              </span>
              <h2 className="text-xl font-bold text-blue-900">{activeSeason.name}</h2>
            </div>
            <p className="text-blue-700 text-sm mb-4">
              {formatDate(activeSeason.startDate)} – {formatDate(activeSeason.endDate)}
            </p>
            <div className="flex gap-6 text-sm text-blue-800 mb-4">
              <span>{activeSeason._count.seasonPlayers} players</span>
              <span>{activeSeason._count.practices} practices</span>
              <span>Budget: {formatCZK(Number(activeSeason.estimatedRentalCost))}</span>
            </div>
            <Link
              href={`/season/${activeSeason.id}`}
              className="inline-block bg-blue-600 text-white px-5 py-2 rounded font-medium hover:bg-blue-700 transition"
            >
              View Season Details
            </Link>
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-700 mb-4">All Seasons</h2>
        {seasons.length === 0 ? (
          <p className="text-gray-500">No seasons yet. <Link href="/admin/seasons" className="text-blue-600 underline">Create one in admin.</Link></p>
        ) : (
          <div className="space-y-3">
            {seasons.map(season => (
              <Link
                key={season.id}
                href={`/season/${season.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{season.name}</span>
                      {season.isActive && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(season.startDate)} – {formatDate(season.endDate)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{season._count.practices} practices</div>
                    <div>{season._count.seasonPlayers} players</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

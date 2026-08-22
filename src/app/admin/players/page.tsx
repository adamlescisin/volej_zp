import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { createPlayerAction, assignToSeasonAction, removeFromSeasonAction } from './actions';

export default async function PlayersPage() {
  const [players, seasons] = await Promise.all([
    prisma.player.findMany({
      orderBy: { name: 'asc' },
      include: { seasonPlayers: { include: { season: true } } },
    }),
    prisma.season.findMany({ where: { isActive: true }, orderBy: { startDate: 'desc' } }),
  ]);

  const allSeasons = await prisma.season.findMany({ orderBy: { startDate: 'desc' } });

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Players</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New Player</h2>
        <form action={createPlayerAction} className="flex gap-3 flex-wrap">
          <input
            name="name"
            type="text"
            required
            placeholder="Player name"
            className="flex-1 min-w-48 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="contact"
            type="text"
            placeholder="Contact (optional)"
            className="flex-1 min-w-48 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Add Player
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {players.map(player => {
          const activeSeasonIds = new Set(
            player.seasonPlayers.filter(sp => sp.active).map(sp => sp.seasonId)
          );

          return (
            <div key={player.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold text-gray-900">{player.name}</h3>
                  {player.contact && (
                    <p className="text-sm text-gray-500">{player.contact}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-600 mb-2">Season membership:</p>
                <div className="flex flex-wrap gap-2">
                  {allSeasons.map(season => {
                    const isAssigned = activeSeasonIds.has(season.id);
                    return (
                      <form
                        key={season.id}
                        action={isAssigned ? removeFromSeasonAction : assignToSeasonAction}
                      >
                        <input type="hidden" name="playerId" value={player.id} />
                        <input type="hidden" name="seasonId" value={season.id} />
                        <button
                          type="submit"
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                            isAssigned
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {isAssigned ? '✓ ' : '+ '}
                          {season.name}
                        </button>
                      </form>
                    );
                  })}
                  {allSeasons.length === 0 && (
                    <span className="text-sm text-gray-400">No seasons yet.</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {players.length === 0 && (
          <p className="text-gray-500 text-center py-8">No players yet. Add one above.</p>
        )}
      </div>
    </AdminLayout>
  );
}

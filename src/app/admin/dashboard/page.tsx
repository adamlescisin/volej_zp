import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { computeSeasonStats } from '@/lib/calculations';
import { formatCZK, formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      seasonPlayers: {
        include: { player: true },
        where: { active: true },
      },
      practices: {
        include: { attendances: true },
        orderBy: { date: 'asc' },
      },
      deposits: true,
      rentalCosts: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalPlayers = await prisma.player.count();
  const totalSeasons = await prisma.season.count();

  let stats = null;
  if (activeSeason) {
    stats = computeSeasonStats(
      activeSeason.practices,
      activeSeason.seasonPlayers,
      activeSeason.deposits,
      activeSeason.estimatedRentalCost
    );
  }

  const upcomingPractices = activeSeason
    ? activeSeason.practices.filter(p => new Date(p.date) >= new Date() && p.status !== 'cancelled')
    : [];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Players</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalPlayers}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Seasons</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalSeasons}</div>
        </div>
        {activeSeason && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Season Players</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{activeSeason.seasonPlayers.length}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Practices</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{activeSeason.practices.length}</div>
            </div>
          </>
        )}
      </div>

      {activeSeason ? (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Active Season: {activeSeason.name}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Period</dt>
                <dd className="font-medium">{formatDate(activeSeason.startDate)} – {formatDate(activeSeason.endDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Budget</dt>
                <dd className="font-medium">{formatCZK(Number(activeSeason.estimatedRentalCost))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Cost/Practice</dt>
                <dd className="font-medium">{formatCZK(stats?.costPerPractice || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total Deposits</dt>
                <dd className="font-medium">
                  {formatCZK(activeSeason.deposits.reduce((s, d) => s + Number(d.amount), 0))}
                </dd>
              </div>
            </dl>
            <Link href={`/season/${activeSeason.id}`} className="mt-4 inline-block text-blue-600 text-sm hover:underline">
              View public page →
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Practices</h2>
            {upcomingPractices.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming practices.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingPractices.slice(0, 5).map(p => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/practices/${p.id}`}
                      className="flex justify-between items-center text-sm hover:text-blue-600"
                    >
                      <span>{formatDate(p.date)}</span>
                      <span className="text-gray-500">{p.location} · {p.startTime}–{p.endTime}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <p className="text-yellow-800">No active season. <Link href="/admin/seasons" className="underline font-medium">Create one.</Link></p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: '/admin/seasons', label: 'Manage Seasons', icon: '📅' },
          { href: '/admin/players', label: 'Manage Players', icon: '👥' },
          { href: '/admin/schedule', label: 'Schedule', icon: '🗓' },
          { href: '/admin/practices', label: 'Practices & Attendance', icon: '🏐' },
          { href: '/admin/deposits', label: 'Deposits', icon: '💰' },
          { href: '/admin/costs', label: 'Rental Costs', icon: '🧾' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition flex items-center gap-3"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="font-medium text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}

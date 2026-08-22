import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export default async function PracticesPage({
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
        include: {
          _count: { select: { attendances: true } },
        },
      })
    : [];

  const now = new Date();
  const upcoming = practices.filter(p => new Date(p.date) >= now);
  const past = practices.filter(p => new Date(p.date) < now);

  function PracticeRow({ practice }: { practice: typeof practices[number] }) {
    return (
      <Link
        href={`/admin/practices/${practice.id}`}
        className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0"
      >
        <div>
          <div className="font-medium text-gray-900">{formatDate(practice.date)}</div>
          <div className="text-sm text-gray-500">{practice.location} · {practice.startTime}–{practice.endTime}</div>
          {practice.notes && <div className="text-xs text-gray-400 mt-0.5">{practice.notes}</div>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">{practice._count.attendances} attendees</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            practice.status === 'completed' ? 'bg-green-100 text-green-700' :
            practice.status === 'cancelled' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {practice.status}
          </span>
          <span className="text-blue-600">→</span>
        </div>
      </Link>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Practices</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/practices" />
      </div>

      {selectedSeasonId ? (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Upcoming ({upcoming.length})</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {upcoming.map(p => <PracticeRow key={p.id} practice={p} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Past ({past.length})</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {[...past].reverse().map(p => <PracticeRow key={p.id} practice={p} />)}
              </div>
            </section>
          )}

          {practices.length === 0 && (
            <p className="text-gray-500 text-sm">
              No practices for this season. Go to{' '}
              <Link href={`/admin/schedule?seasonId=${selectedSeasonId}`} className="text-blue-600 underline">
                Schedule
              </Link>{' '}
              to generate them.
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-500">Please select a season.</p>
      )}
    </AdminLayout>
  );
}

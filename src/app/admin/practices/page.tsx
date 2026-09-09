import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { deletePracticesAction } from './actions';

export const dynamic = 'force-dynamic';

function statusLabel(status: string) {
  if (status === 'completed') return 'Odehráno';
  if (status === 'cancelled') return 'Zrušeno';
  return 'Naplánováno';
}

function czechWeekday(date: Date): string {
  const day = date.toLocaleDateString('cs-CZ', { weekday: 'long' });
  return day.charAt(0).toUpperCase() + day.slice(1);
}

type Practice = {
  id: string;
  date: Date;
  location: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  _count: { attendances: number };
};

function PracticeRow({ practice }: { practice: Practice }) {
  return (
    <div className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
      <div className="pl-4 pr-2 flex-shrink-0">
        <input
          type="checkbox"
          name="practiceId"
          value={practice.id}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </div>
      <Link
        href={`/admin/practices/${practice.id}`}
        className="flex items-center justify-between px-4 py-4 flex-1 min-w-0"
      >
        <div className="min-w-0">
          <div className="font-medium text-gray-900">
            <span className="text-blue-700 mr-2">{czechWeekday(new Date(practice.date))}</span>
            <span className="text-gray-600 font-normal">{formatDate(practice.date)}</span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{practice.location} · {practice.startTime}–{practice.endTime}</div>
          {practice.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{practice.notes}</div>}
        </div>
        <div className="flex items-center gap-3 text-sm flex-shrink-0 ml-4">
          <span className="text-gray-500">{practice._count.attendances} účastníků</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            practice.status === 'completed' ? 'bg-green-100 text-green-700' :
            practice.status === 'cancelled' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {statusLabel(practice.status)}
          </span>
          <span className="text-blue-600">→</span>
        </div>
      </Link>
    </div>
  );
}

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

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tréninky</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/practices" />
      </div>

      {selectedSeasonId ? (
        <form action={deletePracticesAction}>
          <div className="flex justify-end mb-4">
            <button
              type="submit"
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              onClick={(e) => {
                if (!confirm('Smazat vybrané tréninky? Tato akce je nevratná.')) e.preventDefault();
              }}
            >
              Smazat vybrané
            </button>
          </div>

          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Nadcházející ({upcoming.length})</h2>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {upcoming.map(p => <PracticeRow key={p.id} practice={p} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Minulé ({past.length})</h2>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {[...past].reverse().map(p => <PracticeRow key={p.id} practice={p} />)}
                </div>
              </section>
            )}

            {practices.length === 0 && (
              <p className="text-gray-500 text-sm">
                Žádné tréninky pro tuto sezónu. Přejděte na{' '}
                <Link href={`/admin/schedule?seasonId=${selectedSeasonId}`} className="text-blue-600 underline">
                  Rozvrh
                </Link>{' '}
                a vygenerujte je.
              </p>
            )}
          </div>
        </form>
      ) : (
        <p className="text-gray-500">Prosím vyberte sezónu.</p>
      )}
    </AdminLayout>
  );
}

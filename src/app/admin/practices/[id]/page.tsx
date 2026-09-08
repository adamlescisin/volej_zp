import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { formatDate, formatCZK } from '@/lib/utils';
import Link from 'next/link';
import {
  updatePractice,
  toggleAttendance,
  addAdHocAttendee,
  removeAttendee,
} from '../actions';

export const dynamic = 'force-dynamic';

export default async function PracticeDetailPage({ params }: { params: { id: string } }) {
  const practice = await prisma.practice.findUnique({
    where: { id: params.id },
    include: {
      season: {
        include: {
          seasonPlayers: {
            where: { active: true },
            include: { player: true },
          },
        },
      },
      attendances: {
        include: { player: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!practice) notFound();

  const permanentAttendees = new Set(
    practice.attendances
      .filter(a => a.type === 'PERMANENT' && a.confirmed)
      .map(a => a.playerId)
  );

  const adHocAttendees = practice.attendances.filter(a => a.type === 'ADHOC');
  const totalAdHocFees = adHocAttendees.reduce((s, a) => s + (a.adHocFee ? Number(a.adHocFee) : 0), 0);

  function statusLabel(status: string) {
    if (status === 'completed') return 'Odehráno';
    if (status === 'cancelled') return 'Zrušeno';
    return 'Naplánováno';
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/practices" className="text-blue-600 hover:underline text-sm">← Tréninky</Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Trénink — {formatDate(practice.date)}
        </h1>
        <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${
          practice.status === 'completed' ? 'bg-green-100 text-green-700' :
          practice.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {statusLabel(practice.status)}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Levý sloupec: detaily + stav */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Detaily</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Místo</dt>
                <dd className="font-medium">{practice.location}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Čas</dt>
                <dd className="font-medium">{practice.startTime}–{practice.endTime}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Sezóna</dt>
                <dd className="font-medium">{practice.season.name}</dd>
              </div>
            </dl>

            <form action={updatePractice} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={practice.id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
                <select
                  name="status"
                  defaultValue={practice.status}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="scheduled">Naplánováno</option>
                  <option value="completed">Odehráno</option>
                  <option value="cancelled">Zrušeno</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
                <textarea
                  name="notes"
                  defaultValue={practice.notes || ''}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-800 transition"
              >
                Uložit
              </button>
            </form>
          </div>

          {/* Shrnutí náhradníků */}
          {adHocAttendees.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Příjmy za náhradníky</h2>
              <p className="text-2xl font-bold text-green-600">{formatCZK(totalAdHocFees)}</p>
              <p className="text-sm text-gray-500">{adHocAttendees.length} náhradník(ů)</p>
            </div>
          )}
        </div>

        {/* Pravý sloupec: docházka */}
        <div className="md:col-span-2 space-y-6">
          {/* Stálí hráči */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              Hráči sezóny ({permanentAttendees.size}/{practice.season.seasonPlayers.length} přítomno)
            </h2>
            <div className="space-y-2">
              {practice.season.seasonPlayers.map(sp => {
                const isPresent = permanentAttendees.has(sp.playerId);
                const attendance = practice.attendances.find(
                  a => a.playerId === sp.playerId && a.type === 'PERMANENT'
                );
                return (
                  <form
                    key={sp.playerId}
                    action={toggleAttendance}
                    className="flex items-center justify-between"
                  >
                    <input type="hidden" name="practiceId" value={practice.id} />
                    <input type="hidden" name="playerId" value={sp.playerId} />
                    <input type="hidden" name="currentlyPresent" value={String(isPresent)} />
                    {attendance && <input type="hidden" name="attendanceId" value={attendance.id} />}
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        isPresent ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {isPresent && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor"><path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7z"/></svg>}
                      </div>
                      <span className={`text-sm ${isPresent ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {sp.player.name}
                      </span>
                    </label>
                    <button
                      type="submit"
                      className={`text-xs px-3 py-1 rounded transition ${
                        isPresent
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {isPresent ? 'Označit nepřítomným' : 'Označit přítomným'}
                    </button>
                  </form>
                );
              })}
              {practice.season.seasonPlayers.length === 0 && (
                <p className="text-sm text-gray-500">Žádní hráči v této sezóně.</p>
              )}
            </div>
          </div>

          {/* Náhradníci */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Náhradníci</h2>

            {adHocAttendees.length > 0 && (
              <div className="mb-4 space-y-2">
                {adHocAttendees.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{a.adHocName}</span>
                    <div className="flex items-center gap-3">
                      {a.adHocFee && (
                        <span className="text-green-600 font-medium">{formatCZK(Number(a.adHocFee))}</span>
                      )}
                      <form action={removeAttendee}>
                        <input type="hidden" name="attendanceId" value={a.id} />
                        <input type="hidden" name="practiceId" value={practice.id} />
                        <button type="submit" className="text-red-400 hover:text-red-600 text-xs">
                          Odebrat
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form action={addAdHocAttendee} className="flex flex-wrap gap-3 items-end">
              <input type="hidden" name="practiceId" value={practice.id} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jméno</label>
                <input
                  name="adHocName"
                  required
                  placeholder="Jméno hosta"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Poplatek (Kč)</label>
                <input
                  name="adHocFee"
                  type="number"
                  step="50"
                  min="0"
                  placeholder="např. 100"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition"
              >
                Přidat náhradníka
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

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

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/practices" className="text-blue-600 hover:underline text-sm">← Practices</Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Practice — {formatDate(practice.date)}
        </h1>
        <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${
          practice.status === 'completed' ? 'bg-green-100 text-green-700' :
          practice.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {practice.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: practice info + status */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Location</dt>
                <dd className="font-medium">{practice.location}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Time</dt>
                <dd className="font-medium">{practice.startTime}–{practice.endTime}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Season</dt>
                <dd className="font-medium">{practice.season.name}</dd>
              </div>
            </dl>

            <form action={updatePractice} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={practice.id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={practice.status}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
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
                Save
              </button>
            </form>
          </div>

          {/* Ad-hoc summary */}
          {adHocAttendees.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Ad-hoc Income</h2>
              <p className="text-2xl font-bold text-green-600">{formatCZK(totalAdHocFees)}</p>
              <p className="text-sm text-gray-500">{adHocAttendees.length} ad-hoc attendee(s)</p>
            </div>
          )}
        </div>

        {/* Right: attendance */}
        <div className="md:col-span-2 space-y-6">
          {/* Permanent players */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              Season Players ({permanentAttendees.size}/{practice.season.seasonPlayers.length} present)
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
                      {isPresent ? 'Mark absent' : 'Mark present'}
                    </button>
                  </form>
                );
              })}
              {practice.season.seasonPlayers.length === 0 && (
                <p className="text-sm text-gray-500">No players in this season.</p>
              )}
            </div>
          </div>

          {/* Ad-hoc attendees */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Ad-hoc Attendees</h2>

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
                          Remove
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="adHocName"
                  required
                  placeholder="Guest name"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fee (CZK)</label>
                <input
                  name="adHocFee"
                  type="number"
                  step="50"
                  min="0"
                  placeholder="e.g. 100"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition"
              >
                Add Ad-hoc
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { createScheduleAction, deleteScheduleAction, generatePracticesAction } from './actions';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { seasonId?: string };
}) {
  const seasons = await prisma.season.findMany({ orderBy: { startDate: 'desc' } });
  const selectedSeasonId = searchParams.seasonId || seasons.find(s => s.isActive)?.id;

  const schedules = selectedSeasonId
    ? await prisma.practiceSchedule.findMany({
        where: { seasonId: selectedSeasonId, active: true },
        orderBy: { dayOfWeek: 'asc' },
      })
    : [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Practice Schedule</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/schedule" />
      </div>

      {selectedSeasonId ? (
        <>
          {/* Add schedule entry */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Schedule Entry</h2>
            <form action={createScheduleAction} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <input type="hidden" name="seasonId" value={selectedSeasonId} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select
                  name="dayOfWeek"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DAY_NAMES.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  name="startTime"
                  type="time"
                  required
                  defaultValue="19:00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  name="endTime"
                  type="time"
                  required
                  defaultValue="21:00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  name="location"
                  required
                  placeholder="e.g. Sports Hall A"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
                >
                  Add Schedule
                </button>
              </div>
            </form>
          </div>

          {/* Existing schedules */}
          {schedules.length === 0 ? (
            <p className="text-gray-500 text-sm">No schedules for this season.</p>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div key={schedule.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{DAY_NAMES[schedule.dayOfWeek]}</span>
                    <span className="text-gray-500 text-sm ml-3">{schedule.startTime}–{schedule.endTime}</span>
                    <span className="text-gray-500 text-sm ml-3">@ {schedule.location}</span>
                  </div>
                  <div className="flex gap-2">
                    <form action={generatePracticesAction.bind(null, schedule.id)}>
                      <button
                        type="submit"
                        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition"
                      >
                        Generate Practices
                      </button>
                    </form>
                    <form action={deleteScheduleAction.bind(null, schedule.id)}>
                      <button
                        type="submit"
                        className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500">Please select a season.</p>
      )}
    </AdminLayout>
  );
}

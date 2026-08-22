'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function createScheduleAction(formData: FormData) {
  const seasonId = formData.get('seasonId') as string;
  const dayOfWeek = parseInt(formData.get('dayOfWeek') as string, 10);
  const startTime = formData.get('startTime') as string;
  const endTime = formData.get('endTime') as string;
  const location = formData.get('location') as string;

  if (!seasonId || !startTime || !endTime || !location || isNaN(dayOfWeek)) {
    return;
  }

  await prisma.practiceSchedule.create({
    data: { seasonId, dayOfWeek, startTime, endTime, location },
  });

  revalidatePath('/admin/schedule');
}

export async function deleteScheduleAction(id: string) {
  await prisma.practiceSchedule.update({ where: { id }, data: { active: false } });
  revalidatePath('/admin/schedule');
}

export async function generatePracticesAction(scheduleId: string) {
  const schedule = await prisma.practiceSchedule.findUnique({
    where: { id: scheduleId },
    include: { season: true },
  });

  if (!schedule) return;

  const season = schedule.season;
  const start = new Date(season.startDate);
  const end = new Date(season.endDate);

  // Walk through the date range and find all matching days
  const dates: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    if (cursor.getDay() === schedule.dayOfWeek) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Fetch existing practices to avoid duplicates
  const existing = await prisma.practice.findMany({
    where: { seasonId: season.id },
    select: { date: true },
  });
  const existingDates = new Set(existing.map(p => p.date.toISOString().split('T')[0]));

  const toCreate = dates.filter(d => !existingDates.has(d.toISOString().split('T')[0]));

  await prisma.practice.createMany({
    data: toCreate.map(date => ({
      seasonId: season.id,
      date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location,
      status: 'scheduled',
    })),
  });

  revalidatePath('/admin/practices');
  revalidatePath('/admin/schedule');

}


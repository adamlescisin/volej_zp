'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updatePracticeStatus(formData: FormData) {
  const id = formData.get('id') as string;
  const status = formData.get('status') as string;

  await prisma.practice.update({ where: { id }, data: { status } });
  revalidatePath('/admin/practices');
  revalidatePath(`/admin/practices/${id}`);
}

export async function updatePractice(formData: FormData) {
  const id = formData.get('id') as string;
  const status = formData.get('status') as string;
  const notes = formData.get('notes') as string;

  await prisma.practice.update({
    where: { id },
    data: { status, notes: notes || null },
  });

  revalidatePath('/admin/practices');
  revalidatePath(`/admin/practices/${id}`);
}

export async function toggleAttendance(formData: FormData) {
  const practiceId = formData.get('practiceId') as string;
  const playerId = formData.get('playerId') as string;
  const currentlyPresent = formData.get('currentlyPresent') === 'true';

  if (currentlyPresent) {
    await prisma.attendance.deleteMany({
      where: { practiceId, playerId, type: 'PERMANENT' },
    });
  } else {
    await prisma.attendance.create({
      data: { practiceId, playerId, type: 'PERMANENT', confirmed: true },
    });
  }

  revalidatePath(`/admin/practices/${practiceId}`);
}

export async function addAdHocAttendee(formData: FormData) {
  const practiceId = formData.get('practiceId') as string;
  const adHocName = formData.get('adHocName') as string;
  const adHocFeeStr = formData.get('adHocFee') as string;
  const adHocFee = adHocFeeStr ? parseFloat(adHocFeeStr) : null;

  if (!adHocName) return;

  await prisma.attendance.create({
    data: {
      practiceId,
      adHocName,
      type: 'ADHOC',
      confirmed: true,
      adHocFee: adHocFee !== null ? adHocFee : undefined,
    },
  });

  revalidatePath(`/admin/practices/${practiceId}`);
}

export async function removeAttendee(formData: FormData) {
  const attendanceId = formData.get('attendanceId') as string;
  const practiceId = formData.get('practiceId') as string;

  await prisma.attendance.delete({ where: { id: attendanceId } });

  revalidatePath(`/admin/practices/${practiceId}`);
}

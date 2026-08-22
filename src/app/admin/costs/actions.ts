'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function createRentalCostAction(formData: FormData) {
  const seasonId = formData.get('seasonId') as string;
  const practiceId = (formData.get('practiceId') as string) || null;
  const amount = parseFloat(formData.get('amount') as string);
  const date = new Date(formData.get('date') as string);
  const vendor = (formData.get('vendor') as string) || null;
  const note = (formData.get('note') as string) || null;

  if (!seasonId || isNaN(amount) || isNaN(date.getTime())) return;

  await prisma.rentalCost.create({
    data: { seasonId, practiceId: practiceId || null, amount, date, vendor, note },
  });
  revalidatePath('/admin/costs');
}

export async function deleteRentalCostAction(id: string) {
  await prisma.rentalCost.delete({ where: { id } });
  revalidatePath('/admin/costs');
}

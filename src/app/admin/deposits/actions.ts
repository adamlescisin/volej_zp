'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function createDepositAction(formData: FormData) {
  const seasonId = formData.get('seasonId') as string;
  const playerId = formData.get('playerId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const date = new Date(formData.get('date') as string);
  const note = (formData.get('note') as string) || null;

  if (!seasonId || !playerId || isNaN(amount) || isNaN(date.getTime())) return;

  await prisma.deposit.create({ data: { seasonId, playerId, amount, date, note } });
  revalidatePath('/admin/deposits');
}

export async function deleteDepositAction(id: string) {
  await prisma.deposit.delete({ where: { id } });
  revalidatePath('/admin/deposits');
}

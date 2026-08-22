'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function createPlayerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const contact = (formData.get('contact') as string) || null;

  if (!name) return;

  await prisma.player.create({ data: { name, contact } });
  revalidatePath('/admin/players');
}

export async function updatePlayerAction(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const contact = (formData.get('contact') as string) || null;

  await prisma.player.update({ where: { id }, data: { name, contact } });
  revalidatePath('/admin/players');
}

export async function assignToSeasonAction(formData: FormData) {
  const playerId = formData.get('playerId') as string;
  const seasonId = formData.get('seasonId') as string;

  await prisma.seasonPlayer.upsert({
    where: { seasonId_playerId: { seasonId, playerId } },
    create: { seasonId, playerId, active: true },
    update: { active: true },
  });
  revalidatePath('/admin/players');
}

export async function removeFromSeasonAction(formData: FormData) {
  const playerId = formData.get('playerId') as string;
  const seasonId = formData.get('seasonId') as string;

  await prisma.seasonPlayer.update({
    where: { seasonId_playerId: { seasonId, playerId } },
    data: { active: false },
  });
  revalidatePath('/admin/players');
}

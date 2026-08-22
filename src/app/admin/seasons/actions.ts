'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function createSeasonAction(formData: FormData) {
  const name = formData.get('name') as string;
  const startDate = new Date(formData.get('startDate') as string);
  const endDate = new Date(formData.get('endDate') as string);
  const estimatedRentalCost = parseFloat(formData.get('estimatedRentalCost') as string);

  if (!name || isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(estimatedRentalCost)) {
    return;
  }

  await prisma.season.create({
    data: { name, startDate, endDate, estimatedRentalCost },
  });

  revalidatePath('/admin/seasons');
  revalidatePath('/');
}

export async function updateSeasonAction(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const startDate = new Date(formData.get('startDate') as string);
  const endDate = new Date(formData.get('endDate') as string);
  const estimatedRentalCost = parseFloat(formData.get('estimatedRentalCost') as string);

  await prisma.season.update({
    where: { id },
    data: { name, startDate, endDate, estimatedRentalCost },
  });

  revalidatePath('/admin/seasons');
  revalidatePath('/');
}

export async function toggleSeasonActiveAction(id: string, isActive: boolean) {
  await prisma.season.update({ where: { id }, data: { isActive } });
  revalidatePath('/admin/seasons');
  revalidatePath('/');
}

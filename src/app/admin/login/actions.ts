'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { setAdminSession } from '@/lib/auth';

export async function loginAction(formData: FormData): Promise<{ error: string } | undefined> {
  const password = formData.get('password') as string;
  const hash = process.env.ADMIN_PASSWORD_HASH || '';

  if (!hash) {
    return { error: 'ADMIN_PASSWORD_HASH environment variable is not set.' };
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return { error: 'Invalid password' };
  }

  await setAdminSession();
  redirect('/admin/dashboard');
}

export async function logoutAction() {
  const { clearAdminSession } = await import('@/lib/auth');
  await clearAdminSession();
  redirect('/admin/login');
}

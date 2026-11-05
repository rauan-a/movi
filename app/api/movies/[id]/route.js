import { NextResponse } from 'next/server';
import { db } from '../../../../lib/supabase';
import { checkCode } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// Перенос в «Посмотрели» / изменение оценки и даты
export async function PATCH(req, { params }) {
  if (!(await checkCode(req))) {
    return NextResponse.json({ error: 'Неверный код' }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const patch = {};
  if (b.status === 'watched' || b.status === 'wishlist') patch.status = b.status;
  if (b.rating === null || (Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 10)) {
    patch.rating = b.rating;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(b.watched_at || '')) patch.watched_at = b.watched_at;
  if (patch.status === 'watched' && !patch.watched_at) {
    patch.watched_at = new Date().toISOString().slice(0, 10);
  }
  if (patch.status === 'wishlist') {
    patch.watched_at = null;
    patch.rating = null;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Нечего менять' }, { status: 400 });
  }
  const { data, error } = await db()
    .from('movies')
    .update(patch)
    .eq('id', params.id)
    .is('deleted_at', null)
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'Не удалось обновить' }, { status: 500 });
  return NextResponse.json(data);
}

// Мягкое удаление: строка остаётся в базе, просто скрывается
export async function DELETE(req, { params }) {
  if (!(await checkCode(req))) {
    return NextResponse.json({ error: 'Неверный код' }, { status: 401 });
  }
  const { error } = await db()
    .from('movies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: 'Не удалось удалить' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

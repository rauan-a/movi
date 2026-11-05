import { NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
import { checkCode } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db()
    .from('movies')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Не удалось загрузить список' }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  if (!(await checkCode(req))) {
    return NextResponse.json({ error: 'Неверный код' }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const title = String(b.title || '').trim().slice(0, 200);
  const status = b.status === 'watched' ? 'watched' : b.status === 'wishlist' ? 'wishlist' : null;
  if (!title || !status) {
    return NextResponse.json({ error: 'Нужны название и статус' }, { status: 400 });
  }
  const rating = Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 10 ? b.rating : null;
  const row = {
    tmdb_id: Number.isInteger(b.tmdb_id) ? b.tmdb_id : null,
    title,
    year: Number.isInteger(b.year) ? b.year : null,
    poster_path: b.poster_path ? String(b.poster_path).slice(0, 200) : null,
    overview: b.overview ? String(b.overview).slice(0, 2000) : null,
    status,
    rating: status === 'watched' ? rating : null,
    watched_at:
      status === 'watched'
        ? /^\d{4}-\d{2}-\d{2}$/.test(b.watched_at || '')
          ? b.watched_at
          : new Date().toISOString().slice(0, 10)
        : null,
  };
  const { data, error } = await db().from('movies').insert(row).select().single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Этот фильм уже есть в списке' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

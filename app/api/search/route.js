import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json([]);
  const key = process.env.TMDB_API_KEY;
  if (!key) return NextResponse.json({ error: 'Не задан TMDB_API_KEY' }, { status: 500 });
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${key}&language=ru-RU&include_adult=false&query=${encodeURIComponent(q)}`,
      { cache: 'no-store' }
    );
    if (!r.ok) throw new Error('tmdb');
    const j = await r.json();
    const out = (j.results || []).slice(0, 8).map((m) => ({
      tmdb_id: m.id,
      title: m.title,
      year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) || null : null,
      poster_path: m.poster_path || null,
      overview: m.overview || null,
    }));
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: 'Поиск сейчас недоступен' }, { status: 502 });
  }
}

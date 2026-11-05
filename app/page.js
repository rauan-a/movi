'use client';

import { useEffect, useMemo, useState } from 'react';

const IMG = (p, s = 'w342') => (p ? `https://image.tmdb.org/t/p/${s}${p}` : null);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
const plural = (n, [one, few, many]) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

async function api(path, { method = 'GET', code, body } = {}) {
  const res = await fetch(path, {
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(code ? { 'x-access-code': encodeURIComponent(code) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Что-то пошло не так');
  return data;
}

function Modal({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
        {children}
      </div>
    </div>
  );
}

function RatingSelect({ value, onChange }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Без оценки</option>
      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
        <option key={n} value={n}>{n} из 10</option>
      ))}
    </select>
  );
}

function CodeField({ code, setCode }) {
  return (
    <label className="field">
      <span>Секретный код</span>
      <input
        className="input"
        type="password"
        autoCapitalize="none"
        autoComplete="off"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Введите код"
      />
    </label>
  );
}

function AddModal({ code, setCode, onClose, onDone }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState(null);
  const [status, setStatus] = useState('watched');
  const [rating, setRating] = useState('');
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (picked || q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults(await api('/api/search?q=' + encodeURIComponent(q.trim())));
        setErr('');
      } catch (e) {
        setErr(e.message);
        setResults([]);
      }
      setSearched(true);
    }, 350);
    return () => clearTimeout(t);
  }, [q, picked]);

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      await api('/api/movies', {
        method: 'POST',
        code,
        body: {
          ...picked,
          status,
          rating: status === 'watched' && rating ? Number(rating) : null,
          watched_at: status === 'watched' ? date : null,
        },
      });
      await onDone();
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>Добавить фильм</h2>
      {!picked ? (
        <>
          <input
            className="input"
            autoFocus
            placeholder="Название фильма"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="results">
            {results.map((m) => (
              <li key={m.tmdb_id}>
                <button className="result" onClick={() => setPicked(m)}>
                  <span className="thumb">{m.poster_path && <img src={IMG(m.poster_path, 'w92')} alt="" />}</span>
                  <span>
                    <b>{m.title}</b>
                    <span className="muted">{m.year || 'год неизвестен'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {searched && results.length === 0 && q.trim().length >= 2 && (
            <div className="actions">
              <button
                className="btn"
                onClick={() => setPicked({ title: q.trim(), tmdb_id: null, year: null, poster_path: null, overview: null })}
              >
                Добавить «{q.trim()}» без постера
              </button>
            </div>
          )}
          {err && <p className="error">{err}</p>}
        </>
      ) : (
        <>
          <div className="detail-top">
            <div className={'poster' + (picked.poster_path ? '' : ' empty')}>
              {picked.poster_path ? <img src={IMG(picked.poster_path)} alt="" /> : 'Без постера'}
            </div>
            <div className="detail-info">
              <h2>{picked.title}</h2>
              <p className="muted">{picked.year || ''}</p>
              <button className="btn" onClick={() => setPicked(null)}>Выбрать другой</button>
            </div>
          </div>

          <div className="seg">
            <button className={status === 'watched' ? 'on' : ''} onClick={() => setStatus('watched')}>Уже смотрели</button>
            <button className={status === 'wishlist' ? 'on' : ''} onClick={() => setStatus('wishlist')}>Хотим посмотреть</button>
          </div>

          {status === 'watched' && (
            <div className="row">
              <label className="field">
                <span>Оценка</span>
                <RatingSelect value={rating} onChange={setRating} />
              </label>
              <label className="field">
                <span>Дата просмотра</span>
                <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>
          )}

          <CodeField code={code} setCode={setCode} />
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="btn primary" disabled={saving || !code} onClick={save}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function DetailModal({ movie, code, setCode, onClose, onDone, onReroll }) {
  const [rating, setRating] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await onDone();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  const markWatched = () =>
    run(() =>
      api('/api/movies/' + movie.id, {
        method: 'PATCH',
        code,
        body: { status: 'watched', rating: rating ? Number(rating) : null, watched_at: date },
      })
    );
  const remove = () => run(() => api('/api/movies/' + movie.id, { method: 'DELETE', code }));

  return (
    <Modal onClose={onClose}>
      <div className="detail-top">
        <div className={'poster' + (movie.poster_path ? '' : ' empty')}>
          {movie.poster_path ? <img src={IMG(movie.poster_path, 'w500')} alt="" /> : 'Без постера'}
        </div>
        <div className="detail-info">
          <h2>{movie.title}</h2>
          <p className="muted">{movie.year || ''}</p>
          {movie.status === 'watched' && (
            <p className="muted">
              Посмотрели {fmtDate(movie.watched_at)}
              {movie.rating ? ` · оценка ${movie.rating}/10` : ''}
            </p>
          )}
        </div>
      </div>
      {movie.overview && <p className="overview">{movie.overview}</p>}

      {movie.status === 'wishlist' && (
        <div className="row">
          <label className="field">
            <span>Оценка</span>
            <RatingSelect value={rating} onChange={setRating} />
          </label>
          <label className="field">
            <span>Дата просмотра</span>
            <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
      )}

      <CodeField code={code} setCode={setCode} />
      {err && <p className="error">{err}</p>}

      <div className="actions">
        {movie.status === 'wishlist' && (
          <button className="btn primary" disabled={busy || !code} onClick={markWatched}>
            Мы посмотрели
          </button>
        )}
        {movie.random && (
          <button className="btn" disabled={busy} onClick={onReroll}>Другой фильм</button>
        )}
        {!confirmDel ? (
          <button className="btn danger" disabled={busy} onClick={() => setConfirmDel(true)}>Удалить</button>
        ) : (
          <button className="btn danger" disabled={busy || !code} onClick={remove}>
            {busy ? 'Удаляем…' : 'Точно удалить'}
          </button>
        )}
      </div>
    </Modal>
  );
}

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState('watched');
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      setMovies(await api('/api/movies'));
      setLoadErr('');
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const watched = useMemo(
    () =>
      movies
        .filter((m) => m.status === 'watched')
        .sort((a, b) => (b.watched_at || '').localeCompare(a.watched_at || '') || b.id - a.id),
    [movies]
  );
  const wishlist = useMemo(() => movies.filter((m) => m.status === 'wishlist'), [movies]);
  const list = tab === 'watched' ? watched : wishlist;

  const pickRandom = (excludeId) => {
    const pool = wishlist.filter((m) => m.id !== excludeId);
    const src = pool.length ? pool : wishlist;
    return src.length ? src[Math.floor(Math.random() * src.length)] : null;
  };
  const onRandom = () => {
    const m = pickRandom();
    if (!m) {
      setNotice('В списке «Хотим посмотреть» пока пусто. Добавьте туда пару фильмов.');
      setTimeout(() => setNotice(''), 4000);
      return;
    }
    setSelected({ ...m, random: true });
  };
  const onReroll = () => {
    const m = pickRandom(selected?.id);
    if (m) setSelected({ ...m, random: true });
  };
  const afterChange = async () => {
    setAdding(false);
    setSelected(null);
    await load();
  };

  return (
    <main className="wrap">
      <section className="hero">
        <p className="hero-label">Мы посмотрели вместе</p>
        <p className="hero-count">{watched.length}</p>
        <p className="hero-unit">{plural(watched.length, ['фильм', 'фильма', 'фильмов'])}</p>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => setAdding(true)}>Добавить фильм</button>
          <button className="btn" onClick={onRandom}>Случайный фильм</button>
        </div>
        {notice && <p className="notice">{notice}</p>}
      </section>

      <div className="tabs" role="tablist">
        <button className={'tab' + (tab === 'watched' ? ' active' : '')} onClick={() => setTab('watched')}>
          Посмотрели<span>{watched.length}</span>
        </button>
        <button className={'tab' + (tab === 'wishlist' ? ' active' : '')} onClick={() => setTab('wishlist')}>
          Хотим посмотреть<span>{wishlist.length}</span>
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Загружаем…</p>
      ) : loadErr ? (
        <p className="empty-state">{loadErr}. Обновите страницу.</p>
      ) : list.length === 0 ? (
        <p className="empty-state">
          {tab === 'watched' ? 'Пока ничего не отмечено. Добавьте первый фильм.' : 'Список пуст. Добавьте фильм, который хотите посмотреть.'}
        </p>
      ) : (
        <div className="grid">
          {list.map((m) => (
            <button key={m.id} className="card" onClick={() => setSelected(m)}>
              <div className={'poster' + (m.poster_path ? '' : ' empty')}>
                {m.poster_path ? <img src={IMG(m.poster_path)} alt={m.title} loading="lazy" /> : m.title}
                {m.status === 'watched' && m.rating ? <span className="badge">{m.rating}</span> : null}
              </div>
              <p className="card-title">{m.title}</p>
              <p className="card-meta">
                {m.status === 'watched' ? fmtDate(m.watched_at) : m.year || ''}
              </p>
            </button>
          ))}
        </div>
      )}

      {adding && <AddModal code={code} setCode={setCode} onClose={() => setAdding(false)} onDone={afterChange} />}
      {selected && (
        <DetailModal
          key={selected.id}
          movie={selected}
          code={code}
          setCode={setCode}
          onClose={() => setSelected(null)}
          onDone={afterChange}
          onReroll={onReroll}
        />
      )}
    </main>
  );
}

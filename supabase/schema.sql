create table if not exists public.movies (
  id          bigint generated always as identity primary key,
  tmdb_id     integer,
  title       text not null,
  year        integer,
  poster_path text,
  overview    text,
  status      text not null check (status in ('watched', 'wishlist')),
  rating      integer check (rating between 1 and 10),
  watched_at  date,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- один и тот же фильм нельзя добавить дважды (пока он не удалён)
create unique index if not exists movies_tmdb_unique
  on public.movies (tmdb_id)
  where deleted_at is null and tmdb_id is not null;

-- Закрываем таблицу от публичного доступа: работает только сервер (service_role)
alter table public.movies enable row level security;

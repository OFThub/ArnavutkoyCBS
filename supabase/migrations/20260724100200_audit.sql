-- Denetim izi: tek audit_trigger() fonksiyonu tüm iş tablolarını islem_log'a yazar, updated_at otomatik tazelenir.

set search_path to public, extensions;

create table if not exists public.islem_log (
  id bigint generated always as identity primary key,
  kullanici_id uuid,
  kullanici_eposta text,
  tablo text not null,
  kayit_id text,
  islem text not null,
  eski jsonb,
  yeni jsonb,
  zaman timestamptz not null default now()
);

create index if not exists islem_log_tablo_kayit_idx on public.islem_log (tablo, kayit_id);
create index if not exists islem_log_zaman_idx on public.islem_log (zaman desc);
create index if not exists islem_log_kullanici_idx on public.islem_log (kullanici_id);

create or replace function public.dokunulma_zamani()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_eski jsonb;
  v_yeni jsonb;
  v_kayit text;
begin
  if tg_op = 'DELETE' then
    v_eski := to_jsonb(old);
    v_yeni := null;
  elsif tg_op = 'INSERT' then
    v_eski := null;
    v_yeni := to_jsonb(new);
  else
    v_eski := to_jsonb(old);
    v_yeni := to_jsonb(new);
  end if;

  v_kayit := coalesce(
    v_yeni ->> 'id', v_eski ->> 'id',
    v_yeni ->> 'uavt_kod', v_eski ->> 'uavt_kod',
    v_yeni ->> 'mahalle_uavt', v_eski ->> 'mahalle_uavt'
  );

  insert into public.islem_log (kullanici_id, kullanici_eposta, tablo, kayit_id, islem, eski, yeni)
  values (
    auth.uid(),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email',
    tg_table_name,
    v_kayit,
    tg_op,
    v_eski - 'geom',
    v_yeni - 'geom'
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
  izlenen text[] := array[
    'mahalle', 'deprem_senaryo', 'parsel', 'bina', 'adres',
    'imar_plani', 'imar_lekesi', 'kazi_ruhsat', 'beyan',
    'toplanma_alani', 'acil_ulasim_yolu', 'analiz_calismasi', 'ek_dosya'
  ];
begin
  foreach t in array izlenen loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()',
      t || '_audit', t
    );

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'updated_at'
    ) then
      execute format('drop trigger if exists %I on public.%I', t || '_dokunulma', t);
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.dokunulma_zamani()',
        t || '_dokunulma', t
      );
    end if;
  end loop;
end;
$$;

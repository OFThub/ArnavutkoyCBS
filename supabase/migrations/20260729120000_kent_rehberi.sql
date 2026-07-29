-- Kent rehberi katmanları: proje, zemin etüdü, yol rayiç ve imar uygulama alanı tabloları.
-- Mevcut kazi_ruhsat kalıbını izler: geom + durum + kaynak + zaman damgaları + GIST indeksi.

set search_path to public, extensions;

create table if not exists public.proje (
  id bigint generated always as identity primary key,
  geom geometry(Geometry, 4326),
  ad text not null,
  tur text not null default 'ustyapi',
  durum text not null default 'planlandi',
  baslangic date,
  bitis date,
  yuklenici text,
  butce_tl numeric(16, 2),
  aciklama text,
  kaynak text not null default 'Belediye',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proje_durum_gecerli check (durum in ('planlandi', 'devam', 'tamamlandi', 'iptal')),
  constraint proje_tarih_sirasi check (bitis is null or baslangic is null or bitis >= baslangic)
);

create table if not exists public.zemin_etut (
  id bigint generated always as identity primary key,
  mahalle_uavt text references public.mahalle (uavt_kod) on delete set null,
  geom geometry(Geometry, 4326),
  rapor_no text,
  etut_tarihi date,
  zemin_sinifi text,
  tasima_gucu_kpa numeric(10, 2),
  yeralti_suyu_m numeric(6, 2),
  sivilasma_riski text,
  kaynak text not null default 'Belediye',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zemin_etut_sivilasma_gecerli
    check (sivilasma_riski is null or sivilasma_riski in ('yok', 'dusuk', 'orta', 'yuksek'))
);

create table if not exists public.yol_rayic (
  id bigint generated always as identity primary key,
  mahalle_uavt text references public.mahalle (uavt_kod) on delete set null,
  geom geometry(Geometry, 4326),
  cadde_sokak text not null,
  yil integer not null,
  rayic_tl_m2 numeric(14, 2) not null,
  kaynak text not null default 'Belediye Emlak Servisi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yol_rayic_yil_gecerli check (yil between 2000 and 2100),
  constraint yol_rayic_deger_pozitif check (rayic_tl_m2 > 0)
);

create table if not exists public.imar_uygulama_alani (
  id bigint generated always as identity primary key,
  plan_id bigint references public.imar_plani (id) on delete set null,
  geom geometry(MultiPolygon, 4326),
  ad text not null,
  uygulama_turu text not null default '18-madde',
  encumen_karar_no text,
  karar_tarihi date,
  durum text not null default 'hazirlik',
  kaynak text not null default 'Belediye İmar Müdürlüğü',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imar_uygulama_durum_gecerli
    check (durum in ('hazirlik', 'askida', 'kesinlesti', 'iptal'))
);

create index if not exists proje_geom_idx on public.proje using gist (geom);
create index if not exists zemin_etut_geom_idx on public.zemin_etut using gist (geom);
create index if not exists yol_rayic_geom_idx on public.yol_rayic using gist (geom);
create index if not exists imar_uygulama_alani_geom_idx on public.imar_uygulama_alani using gist (geom);

create index if not exists proje_durum_idx on public.proje (durum);
create index if not exists yol_rayic_yil_idx on public.yol_rayic (yil);
create index if not exists imar_uygulama_plan_idx on public.imar_uygulama_alani (plan_id);

-- RLS: proje kamuya açık (vatandaş nereye ne yapıldığını görmeli), diğer üçü personele özel.
alter table public.proje enable row level security;
alter table public.zemin_etut enable row level security;
alter table public.yol_rayic enable row level security;
alter table public.imar_uygulama_alani enable row level security;

do $$
declare
  t text;
  herkese_acik text[] := array['proje'];
  personele_ozel text[] := array['zemin_etut', 'yol_rayic', 'imar_uygulama_alani'];
  yazilabilir text[] := array['proje', 'zemin_etut', 'yol_rayic', 'imar_uygulama_alani'];
begin
  foreach t in array herkese_acik loop
    execute format('drop policy if exists %I on public.%I', t || '_okuma_herkes', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_okuma_herkes', t
    );
  end loop;

  foreach t in array personele_ozel loop
    execute format('drop policy if exists %I on public.%I', t || '_okuma_personel', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.personel_mi())',
      t || '_okuma_personel', t
    );
  end loop;

  foreach t in array yazilabilir loop
    execute format('drop policy if exists %I on public.%I', t || '_yazma_personel', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.personel_mi()) with check (public.personel_mi())',
      t || '_yazma_personel', t
    );
  end loop;
end;
$$;

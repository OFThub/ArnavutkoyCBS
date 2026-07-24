-- Arnavutköy CBS iş tabloları: idari birim, mülkiyet, yapı, imar, altyapı, afet ve kullanıcı çalışmaları.

set search_path to public, extensions;

create table if not exists public.mahalle (
  uavt_kod text primary key,
  ad text not null,
  geom geometry(MultiPolygon, 4326),
  nufus integer,
  hane integer,
  alan_km2 numeric(10, 3),
  geometri_kaynak text not null default 'yaklasik-voronoi',
  yaklasik boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deprem_senaryo (
  mahalle_uavt text primary key references public.mahalle (uavt_kod) on delete cascade,
  cok_agir_hasarli_bina_sayisi integer not null default 0,
  agir_hasarli_bina_sayisi integer not null default 0,
  orta_hasarli_bina_sayisi integer not null default 0,
  hafif_hasarli_bina_sayisi integer not null default 0,
  can_kaybi_sayisi integer not null default 0,
  agir_yarali_sayisi integer not null default 0,
  hastanede_tedavi_sayisi integer not null default 0,
  hafif_yarali_sayisi integer not null default 0,
  dogalgaz_boru_hasari integer not null default 0,
  icme_suyu_boru_hasari integer not null default 0,
  atik_su_boru_hasari integer not null default 0,
  gecici_barinma integer not null default 0,
  kaynak text not null default 'İBB Açık Veri',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parsel (
  id bigint generated always as identity primary key,
  mahalle_uavt text references public.mahalle (uavt_kod) on delete set null,
  ada text,
  parsel text,
  geom geometry(MultiPolygon, 4326),
  nitelik text,
  malik_tip text,
  alan_m2 numeric(14, 2),
  kaynak text not null default 'TAKBIS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mahalle_uavt, ada, parsel)
);

create table if not exists public.bina (
  id bigint generated always as identity primary key,
  parsel_id bigint references public.parsel (id) on delete set null,
  mahalle_uavt text references public.mahalle (uavt_kod) on delete set null,
  geom geometry(MultiPolygon, 4326),
  kat integer,
  alan_m2 numeric(12, 2),
  uavt_bina_kod text,
  yapi_sinifi text,
  kaynak text not null default 'OSM',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.adres (
  id bigint generated always as identity primary key,
  bina_id bigint references public.bina (id) on delete cascade,
  mahalle_uavt text references public.mahalle (uavt_kod) on delete set null,
  csbm text,
  kapi_no text,
  bagimsiz_bolum text,
  uavt_kod text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.imar_plani (
  id bigint generated always as identity primary key,
  ad text not null,
  olcek text not null,
  onay_tarihi date,
  aski_baslangic date,
  aski_bitis date,
  durum text not null default 'taslak',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imar_plani_durum_gecerli check (durum in ('taslak', 'askida', 'yururlukte', 'iptal'))
);

create table if not exists public.imar_lekesi (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.imar_plani (id) on delete cascade,
  geom geometry(MultiPolygon, 4326),
  fonksiyon text not null,
  taks numeric(4, 2),
  kaks numeric(5, 2),
  hmax numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kazi_ruhsat (
  id bigint generated always as identity primary key,
  geom geometry(LineString, 4326),
  kurum text not null,
  baslangic date not null,
  bitis date not null,
  durum text not null default 'planlandi',
  aciklama text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kazi_ruhsat_tarih_sirasi check (bitis >= baslangic)
);

create table if not exists public.beyan (
  id bigint generated always as identity primary key,
  bina_id bigint not null references public.bina (id) on delete cascade,
  beyan_alan_m2 numeric(12, 2) not null,
  beyan_tarihi date not null,
  mukellef_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.toplanma_alani (
  id bigint generated always as identity primary key,
  mahalle_uavt text references public.mahalle (uavt_kod) on delete set null,
  geom geometry(MultiPolygon, 4326),
  ad text not null,
  kapasite_kisi integer not null default 0,
  alan_m2 numeric(12, 2),
  kaynak text not null default 'AFAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.acil_ulasim_yolu (
  id bigint generated always as identity primary key,
  geom geometry(MultiLineString, 4326),
  ad text,
  derece smallint not null default 1,
  uzunluk_km numeric(10, 3),
  kaynak text not null default 'İBB Açık Veri',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analiz_calismasi (
  id uuid primary key default extensions.gen_random_uuid(),
  sahip uuid not null default auth.uid() references auth.users (id) on delete cascade,
  baslik text not null,
  analiz_id text not null,
  parametreler jsonb not null default '{}'::jsonb,
  sonuc jsonb,
  paylasim_kodu text unique,
  herkese_acik boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ek_dosya (
  id bigint generated always as identity primary key,
  tablo text not null,
  kayit_id text not null,
  storage_yolu text not null,
  dosya_adi text not null,
  mime_tur text,
  boyut_bayt bigint,
  yukleyen uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists mahalle_geom_idx on public.mahalle using gist (geom);
create index if not exists parsel_geom_idx on public.parsel using gist (geom);
create index if not exists bina_geom_idx on public.bina using gist (geom);
create index if not exists imar_lekesi_geom_idx on public.imar_lekesi using gist (geom);
create index if not exists kazi_ruhsat_geom_idx on public.kazi_ruhsat using gist (geom);
create index if not exists toplanma_alani_geom_idx on public.toplanma_alani using gist (geom);
create index if not exists acil_ulasim_yolu_geom_idx on public.acil_ulasim_yolu using gist (geom);

create index if not exists bina_parsel_idx on public.bina (parsel_id);
create index if not exists bina_mahalle_idx on public.bina (mahalle_uavt);
create index if not exists adres_bina_idx on public.adres (bina_id);
create index if not exists imar_lekesi_plan_idx on public.imar_lekesi (plan_id);
create index if not exists beyan_bina_idx on public.beyan (bina_id);
create index if not exists kazi_ruhsat_tarih_idx on public.kazi_ruhsat (baslangic, bitis);
create index if not exists ek_dosya_kayit_idx on public.ek_dosya (tablo, kayit_id);
create index if not exists analiz_calismasi_sahip_idx on public.analiz_calismasi (sahip);

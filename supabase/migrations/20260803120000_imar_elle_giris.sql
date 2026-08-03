-- İmar lekelerinin elle çizilebilmesi ve leke içine tesis (cami, okul, park…) girilebilmesi.
-- imar_lekesi zenginleşir; imar_tesisi leke_id ile lekeye bağlı alt yapıları tutar.

set search_path to public, extensions;

-- Leke, plan paftasındaki tam künyeyi taşımalı: fonksiyon + yapılaşma koşulu + kadastral referans.
alter table public.imar_lekesi add column if not exists ada text;
alter table public.imar_lekesi add column if not exists parsel text;
alter table public.imar_lekesi add column if not exists yapi_nizami text;
alter table public.imar_lekesi add column if not exists kat_adedi integer;
alter table public.imar_lekesi add column if not exists plan_notu text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'imar_lekesi_yapi_nizami_gecerli'
  ) then
    alter table public.imar_lekesi
      add constraint imar_lekesi_yapi_nizami_gecerli
      check (yapi_nizami is null or yapi_nizami in ('ayrik', 'bitisik', 'blok', 'ikiz'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'imar_lekesi_kat_adedi_gecerli'
  ) then
    alter table public.imar_lekesi
      add constraint imar_lekesi_kat_adedi_gecerli
      check (kat_adedi is null or kat_adedi between 1 and 100);
  end if;
end;
$$;

-- Lekenin içindeki tekil yapı/tesis: "bu dini tesis alanına 1200 m² cami, 2027'de".
create table if not exists public.imar_tesisi (
  id bigint generated always as identity primary key,
  leke_id bigint not null references public.imar_lekesi (id) on delete cascade,
  geom geometry(Polygon, 4326),
  tur text not null,
  ad text,
  alan_m2 numeric(12, 2),
  kapasite integer,
  durum text not null default 'planlanan',
  -- durum'a göre okunur: mevcut/yapim_asamasinda ise yapım yılı, planlanan ise hedef yıl.
  yil integer,
  aciklama text,
  kaynak text not null default 'Belediye İmar Müdürlüğü',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imar_tesisi_durum_gecerli
    check (durum in ('mevcut', 'yapim_asamasinda', 'planlanan', 'iptal')),
  constraint imar_tesisi_yil_gecerli check (yil is null or yil between 1900 and 2200),
  constraint imar_tesisi_alan_pozitif check (alan_m2 is null or alan_m2 > 0),
  constraint imar_tesisi_kapasite_pozitif check (kapasite is null or kapasite > 0)
);

create index if not exists imar_tesisi_geom_idx on public.imar_tesisi using gist (geom);
create index if not exists imar_tesisi_leke_idx on public.imar_tesisi (leke_id);
create index if not exists imar_tesisi_durum_idx on public.imar_tesisi (durum);

alter table public.imar_tesisi enable row level security;

-- imar_lekesi ile aynı gizlilik seviyesi: okuma personele özel, yazma personele açık.
drop policy if exists imar_tesisi_okuma_personel on public.imar_tesisi;
create policy imar_tesisi_okuma_personel
  on public.imar_tesisi
  for select
  to authenticated
  using (public.personel_mi());

drop policy if exists imar_tesisi_yazma_personel on public.imar_tesisi;
create policy imar_tesisi_yazma_personel
  on public.imar_tesisi
  for all
  to authenticated
  using (public.personel_mi())
  with check (public.personel_mi());

drop trigger if exists imar_tesisi_audit on public.imar_tesisi;
create trigger imar_tesisi_audit
  after insert or update or delete on public.imar_tesisi
  for each row execute function public.audit_trigger();

drop trigger if exists imar_tesisi_dokunulma on public.imar_tesisi;
create trigger imar_tesisi_dokunulma
  before update on public.imar_tesisi
  for each row execute function public.dokunulma_zamani();

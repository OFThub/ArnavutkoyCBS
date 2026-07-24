-- RLS: anon yalnızca kamuya açık katmanları okur, personel yazar, denetim izini yalnızca yönetici görür.

set search_path to public, extensions;

create or replace function public.rol()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'rol',
    auth.jwt() -> 'app_metadata' ->> 'role',
    'public'
  );
$$;

create or replace function public.personel_mi()
returns boolean
language sql
stable
as $$
  select public.rol() in ('personel', 'yonetici');
$$;

create or replace function public.yonetici_mi()
returns boolean
language sql
stable
as $$
  select public.rol() = 'yonetici';
$$;

alter table public.mahalle enable row level security;
alter table public.deprem_senaryo enable row level security;
alter table public.parsel enable row level security;
alter table public.bina enable row level security;
alter table public.adres enable row level security;
alter table public.imar_plani enable row level security;
alter table public.imar_lekesi enable row level security;
alter table public.kazi_ruhsat enable row level security;
alter table public.beyan enable row level security;
alter table public.toplanma_alani enable row level security;
alter table public.acil_ulasim_yolu enable row level security;
alter table public.analiz_calismasi enable row level security;
alter table public.ek_dosya enable row level security;
alter table public.islem_log enable row level security;

do $$
declare
  t text;
  herkese_acik text[] := array['mahalle', 'deprem_senaryo', 'toplanma_alani', 'acil_ulasim_yolu'];
  personele_ozel text[] := array['parsel', 'bina', 'adres', 'imar_lekesi', 'kazi_ruhsat', 'beyan', 'ek_dosya'];
  yazilabilir text[] := array[
    'mahalle', 'deprem_senaryo', 'parsel', 'bina', 'adres',
    'imar_plani', 'imar_lekesi', 'kazi_ruhsat', 'beyan',
    'toplanma_alani', 'acil_ulasim_yolu', 'ek_dosya'
  ];
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

drop policy if exists imar_plani_okuma_askida on public.imar_plani;
create policy imar_plani_okuma_askida
  on public.imar_plani
  for select
  to anon, authenticated
  using (
    public.personel_mi()
    or (
      durum in ('askida', 'yururlukte')
      and (aski_baslangic is null or aski_baslangic <= current_date)
      and (aski_bitis is null or aski_bitis >= current_date)
    )
  );

drop policy if exists analiz_calismasi_okuma on public.analiz_calismasi;
create policy analiz_calismasi_okuma
  on public.analiz_calismasi
  for select
  to anon, authenticated
  using (herkese_acik or sahip = auth.uid());

drop policy if exists analiz_calismasi_yazma on public.analiz_calismasi;
create policy analiz_calismasi_yazma
  on public.analiz_calismasi
  for all
  to authenticated
  using (sahip = auth.uid())
  with check (sahip = auth.uid());

drop policy if exists islem_log_okuma_yonetici on public.islem_log;
create policy islem_log_okuma_yonetici
  on public.islem_log
  for select
  to authenticated
  using (public.yonetici_mi());

revoke insert, update, delete on public.islem_log from anon, authenticated;

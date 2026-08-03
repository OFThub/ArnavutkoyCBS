-- Mahalle nüfusunun kaynağı ve yılı kayıt altına alınır.
-- nufus/hane sütunları zaten vardı ama hangi yılın verisi olduğu ve nereden geldiği bilinmiyordu;
-- tahmini seed ile gerçek TÜİK değeri arayüzde ayırt edilebilmeli.

set search_path to public, extensions;

alter table public.mahalle add column if not exists veri_yili integer;
alter table public.mahalle add column if not exists nufus_kaynak text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mahalle_veri_yili_gecerli') then
    alter table public.mahalle
      add constraint mahalle_veri_yili_gecerli
      check (veri_yili is null or veri_yili between 1900 and 2200);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'mahalle_nufus_pozitif') then
    alter table public.mahalle
      add constraint mahalle_nufus_pozitif
      check (nufus is null or nufus >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'mahalle_hane_pozitif') then
    alter table public.mahalle
      add constraint mahalle_hane_pozitif
      check (hane is null or hane >= 0);
  end if;
end;
$$;

-- Rol ve denetim fonksiyonlarının search_path'ini sabitler, audit trigger'ını REST üzerinden çağrılamaz yapar.

alter function public.dokunulma_zamani() set search_path = public, extensions;
alter function public.rol() set search_path = public, extensions;
alter function public.personel_mi() set search_path = public, extensions;
alter function public.yonetici_mi() set search_path = public, extensions;

revoke execute on function public.audit_trigger() from public;
revoke execute on function public.audit_trigger() from anon;
revoke execute on function public.audit_trigger() from authenticated;

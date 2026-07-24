-- PostGIS ve yardımcı eklentileri extensions şemasına kurar; sonraki migration'lar bu şemayı search_path'te bekler.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

alter database postgres set search_path to "$user", public, extensions;

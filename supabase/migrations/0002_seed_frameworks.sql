-- Seed the two frameworks covered by this MVP. The ingestion pipeline
-- upserts controls + chunks against these rows.

insert into frameworks (code, title_en, title_ar, version, source_document)
values
  ('ECC',  'Essential Cybersecurity Controls', 'الضوابط الأساسية للأمن السيبراني', '1-2018', 'Guide Ecc.pdf'),
  ('PDPL', 'Personal Data Protection Law',     'نظام حماية البيانات الشخصية',       '1',       'Saudi regulation.pdf')
on conflict (code) do update
set title_en        = excluded.title_en,
    title_ar        = excluded.title_ar,
    version         = excluded.version,
    source_document = excluded.source_document;

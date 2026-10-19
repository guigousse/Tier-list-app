"""Prints the SQL that upserts the online content's translations (templates and daily
lists) from content-i18n/translations-*.json into public.content_translations. Built-in
lists and themes ship inside the app, so they are not sent."""
import json
import sys


def lit(v):
    if v is None:
        return 'null'
    if isinstance(v, list):
        return 'array[' + ', '.join(lit(x) for x in v) + ']::text[]' if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


rows = []
for lang in ('en', 'es', 'el'):
    t = json.load(open(f'content-i18n/translations-{lang}.json', encoding='utf-8'))
    for kind, group in (('template', 'templates'), ('daily', 'daily')):
        for key, v in t[group].items():
            if only := sys.argv[1:]:
                if key not in only:
                    continue
            rows.append(f"({lit(kind)}, {lit(key)}, {lit(lang)}, {lit(v.get('title'))}, {lit(v.get('description'))}, {lit(v.get('items'))}, {lit(v.get('tiers'))})")

print('insert into public.content_translations (kind, key, lang, title, description, items, tiers) values')
print(',\n'.join(rows))
print('on conflict (kind, key, lang) do update set title = excluded.title, description = excluded.description,')
print('  items = excluded.items, tiers = excluded.tiers, updated_at = now();')

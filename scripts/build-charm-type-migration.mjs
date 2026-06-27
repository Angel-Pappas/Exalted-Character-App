import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DIR = 'C:\\Users\\AngeP\\Downloads\\files'
const FILES = [1,2,3,4,5,6,7,8,9].map(n => `exalted_charms_batch${n}.json`)

function esc(s) {
  return String(s ?? '').replace(/'/g, "''")
}

const rows = []
for (const file of FILES) {
  const json = JSON.parse(readFileSync(join(DIR, file), 'utf8'))
  for (const charm of json.charms) {
    rows.push({ ability: charm.ability, name: charm.name, type: charm.type })
  }
}

const updates = rows.map(r =>
  `update public.charm_library set type = '${esc(r.type)}' where ability = '${esc(r.ability)}' and name = '${esc(r.name)}';`
).join('\n')

const sql = `-- Adds an exalt-type column to charm_library and backfills it from the source book data.\n` +
  `-- Safe to run once. Run in the Supabase SQL editor (bypasses RLS as table owner).\n\n` +
  `alter table public.charm_library add column if not exists type text not null default 'Universal';\n\n` +
  `${updates}\n`

writeFileSync(join('supabase', 'migration_charm_type.sql'), sql, 'utf8')
console.log(`Wrote supabase/migration_charm_type.sql with ${rows.length} update statements`)

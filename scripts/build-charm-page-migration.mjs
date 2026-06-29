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
    rows.push({ ability: charm.ability, name: charm.name, page: charm.page })
  }
}

const updates = rows.map(r =>
  `update public.charm_library set page = ${Number(r.page)} where ability = '${esc(r.ability)}' and name = '${esc(r.name)}';`
).join('\n')

const sql = `-- Backfills the page column on charm_library from the source book data. Safe to run once.\n\n${updates}\n`

writeFileSync(join('supabase', 'migration_charm_page_backfill.sql'), sql, 'utf8')
console.log(`Wrote supabase/migration_charm_page_backfill.sql with ${rows.length} update statements`)

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DIR = 'C:\\Users\\AngeP\\Downloads\\files'
const FILES = [1,2,3,4,5,6,7,8,9].map(n => `exalted_charms_batch${n}.json`)

function esc(s) {
  return String(s ?? '').replace(/'/g, "''")
}

function buildDescription(charm) {
  const parts = [String(charm.text ?? '').trim()]
  if (Array.isArray(charm.modes)) {
    for (const m of charm.modes) {
      if (m && typeof m === 'object' && m.label && m.text) {
        parts.push(`[${m.label}] ${m.text}`.trim())
      }
    }
  }
  let desc = parts.filter(Boolean).join('\n\n')
  const tag = charm.type && charm.type !== 'Universal'
    ? `(${charm.type}${charm.page ? `, p.${charm.page}` : ''})`
    : (charm.page ? `(p.${charm.page})` : '')
  if (tag) desc = `${tag}\n\n${desc}`
  return desc
}

const sortCounters = new Map()
const rows = []

for (const file of FILES) {
  const json = JSON.parse(readFileSync(join(DIR, file), 'utf8'))
  for (const charm of json.charms) {
    const ability = String(charm.ability ?? '')
    const n = sortCounters.get(ability) ?? 0
    sortCounters.set(ability, n + 1)
    rows.push({
      ability,
      name: charm.name,
      description: buildDescription(charm),
      sort_order: n,
    })
  }
}

console.log(`Total charms: ${rows.length}`)

const values = rows.map(r =>
  `('${esc(r.ability)}', '${esc(r.name)}', '${esc(r.description)}', ${r.sort_order})`
).join(',\n')

const sql = `-- Auto-generated seed of charm_library from book batches 1-9 (pp. 185-298)\n` +
  `-- Run this once in the Supabase SQL editor while logged in as an admin-capable session,\n` +
  `-- or as the postgres role (RLS is bypassed for the table owner / SQL editor).\n\n` +
  `insert into public.charm_library (ability, name, description, sort_order)\nvalues\n${values};\n`

writeFileSync(join('supabase', 'seed_charms.sql'), sql, 'utf8')
console.log('Wrote supabase/seed_charms.sql')

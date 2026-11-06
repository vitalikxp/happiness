// Card budget report (docs/BALANCE.md §3): `pnpm budget [--pack core-test] [--all]`.
import { parseArgs } from 'node:util';
import { BANDS, budgetPack, validatePack } from '../content/index.ts';
import { PACKS } from '../content/packs/index.ts';

const { values } = parseArgs({
  options: {
    pack: { type: 'string', default: 'core-test' },
    all: { type: 'boolean', default: false },
  },
});
const result = validatePack(PACKS[values.pack]);
if (!result.ok) throw new Error(`Invalid pack "${values.pack}":\n- ${result.errors.join('\n- ')}`);

const lines = budgetPack(result.pack);
const shown = values.all ? lines : lines.filter((l) => !l.ok);
console.log(
  `# Budget: ${values.pack} — ${String(lines.length - shown.length)}/${String(lines.length)} ok\n`,
);
console.log('| | Card | Part | Net (R) | Band |');
console.log('|---|---|---|---|---|');
for (const l of shown) {
  const [min, max] = BANDS[l.band];
  console.log(
    `| ${l.ok ? '✅' : '❌'} | ${l.card} | ${l.part} | ${String(l.net)} | ${l.band} ${String(min)}…${String(max)} |`,
  );
}
if (result.pack.budgetLint === false)
  console.log('\n(budgetLint: false — this pack is not linted in CI)');

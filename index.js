import { checkbox } from '@inquirer/prompts';
import { findWorkspaceDir } from '@pnpm/find-workspace-dir';
import { readWorkspaceManifest } from '@pnpm/workspace.read-manifest';
import cp from 'node:child_process';

function fail(...message) {
  console.error(...message);
  process.exit(1);
}

const root = await findWorkspaceDir(process.cwd());

if (!root) {
  fail('pnpm-workspace.yaml not found');
}

const { groups } = await readWorkspaceManifest(root);

if (typeof groups !== 'object') {
  fail('`groups` key must be an object');
}

if (Object.values(groups).some((group) => !group.every?.((p) => typeof p === 'string'))) {
  fail('`groups` values must be arrays of strings');
}

const selected = await checkbox({
  message: 'Select groups to run',
  choices: Object.keys(groups).map((groupKey) => ({
    name: groupKey,
    value: groupKey,
    description: groups[groupKey].join(', '),
    short: groupKey
  }))
}).catch(() => process.exit(1));

const args = [];

for (const group of selected) {
  for (const project of groups[group]) {
    args.push(`-F=${project}`);
  }
}

// calls pnpm with the selected groups
const result = cp.spawnSync('pnpm', args.concat(process.argv.slice(2)), {
  stdio: 'inherit',
  shell: true
});

// exits with the same status code as pnpm
process.exit(result.status);

#!/usr/bin/env node

import { checkbox, Separator } from '@inquirer/prompts';
import { findWorkspaceDir } from '@pnpm/find-workspace-dir';
import { findWorkspacePackagesNoCheck } from '@pnpm/workspace.find-packages';
import { readWorkspaceManifest } from '@pnpm/workspace.read-manifest';
import { filterPackages } from '@pnpm/filter-workspace-packages';
import cp from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HISTORY_FILE = path.resolve(os.homedir(), '.pnpmf-history');

function fail(...message) {
  console.error(...message);
  process.exit(1);
}

const isTTY = process.stdin.isTTY && process.stdout.isTTY && process.stderr.isTTY;

const args = [];

const argv = process.argv.slice(2);

if (isTTY) {
  const root = await findWorkspaceDir(process.cwd());

  if (!root) {
    fail('pnpm-workspace.yaml not found');
  }

  const [packages, history, { groups }] = await Promise.all([
    findWorkspacePackagesNoCheck(root),
    fs.promises.readFile(HISTORY_FILE, 'utf8').then(
      (r) => JSON.parse(r),
      () => ({})
    ),
    readWorkspaceManifest(root)
  ]);

  if (!groups) {
    fail('`groups` key not found in pnpm-workspace.yaml');
  }

  if (typeof groups !== 'object') {
    fail('`groups` key must be an object');
  }

  if (
    Object.values(groups).some((group) => !group.every?.((p) => typeof p === 'string'))
  ) {
    fail('`groups` values must be arrays of strings');
  }

  if (typeof history !== 'object') {
    await fs.promises.unlink(HISTORY_FILE);
    fail('Invalid history file');
  }

  for (const key in history) {
    if (!Array.isArray(history[key])) {
      delete history[key];
    }
  }

  const lastChoices = (history[root] ??= []);

  // Keep only existing packages
  for (const lastChoice of lastChoices) {
    lastChoice.packages = lastChoice.packages.filter((p) =>
      packages.find((pkg) => pkg.manifest.name === p)
    );
  }

  const filterResult = {};

  for (const groupKey in groups) {
    const { selectedProjectsGraph } = await filterPackages(
      packages,
      groups[groupKey].map((filter) => ({ filter })),
      {
        workspaceDir: root,
        prefix: ''
      }
    );

    filterResult[groupKey] = Object.values(selectedProjectsGraph).map((p) => p.package);
  }

  console.log(`\n${root}\n$ pnpm ${argv.join(' ') || 'install'}\n`);

  const selected = await checkbox({
    message: `Select packages`,
    pageSize: process.stdout.rows - 5,
    required: true,
    loop: false,
    theme: { helpMode: 'always' },
    choices: [
      Object.keys(groups).length && new Separator(' '),
      Object.keys(groups).length && new Separator('Groups:'),
      ...Object.keys(groups).map((groupKey) => ({
        name: groupKey,
        value: filterResult[groupKey].map((pkg) => pkg.manifest.name),
        description: filterResult[groupKey].map((pkg) => pkg.manifest.name).join(', '),
        short: groupKey
      })),
      lastChoices.length && new Separator(' '),
      lastChoices.length && new Separator(`Last ${lastChoices.length} choices:`),
      ...lastChoices
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((choice) => ({
          name: choice.packages.join(', '),
          short: choice.packages.join(', '),
          value: choice.packages,
          description: `Last run: ${new Date(choice.timestamp).toLocaleString()}`
        })),
      new Separator(' '),
      new Separator('Packages:'),
      ...packages.map((pkg) => ({
        name: pkg.manifest.name,
        short: pkg.manifest.name,
        value: [pkg.manifest.name],
        description: `v${pkg.manifest.version} - ${path.relative(
          root,
          pkg.rootDirRealPath
        )}`
      })),
      new Separator(' ')
    ].filter(Boolean)
  }).catch(() => process.exit(1));

  const selectedPackages = selected.flat(1).filter((p, i, arr) => arr.indexOf(p) === i);

  history[root].unshift({ timestamp: Date.now(), packages: selectedPackages });
  history[root] = history[root]
    .slice(0, 10)
    .filter(
      (item, index, arr) =>
        arr.findIndex((t) => t.packages.join() === item.packages.join()) === index
    );

  await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));

  for (const pkg of selectedPackages) {
    args.push(`-F=${pkg}`);
  }

  console.log(`${selectedPackages.join(' ')}\n`);
} else {
  args.push('-r');
}

// `pnpm` alone is an alias for `pnpm install`
if (argv.length > 0) {
  args.push(...argv);
} else {
  args.push('install');
}

// calls pnpm with the selected groups
const result = cp.spawnSync('pnpm', args, {
  stdio: 'inherit',
  shell: true
});

// exits with the same status code as pnpm
process.exit(result.status);

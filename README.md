# pnpmf

A dead simple pnpm group selector.

## Usage

```bash
npm i -g pnpm
```

Then, in your `pnpm-workspace.yaml`:

```yaml
packages:
  # ...

# Define your groups as a list of valid pnpm filters
groups:
  MyGroup:
    - package1
    - package2
  Test:
    - @org/*-ui # Select all packages that match the pattern
  Build:
    - core... # any kind of pnpm filter syntax works!
```

Then, you can replace you `pnpm` calls with `pnpmf` or `pf` to open a checkbox of groups to select from.

```bash
# before
pnpm install

# after
pf install
```

```bash
# before
pnpm --parallel build

pf --parallel build
```

## License

MIT
<h1 align="center">PNPMF</h1>

<p align="center">
  <img src="./pnpmf.gif" alt="PNPMF Example">
</p>

A simple tool to run `pnpm` commands on selected groups of packages from your `pnpm-workspace.yaml`.

## Installation

1. Install `pnpm` globally:

   ```bash
   npm i -g pnpm
   ```

2. Define groups in your `pnpm-workspace.yaml`:

   ```yaml
   # ...

   groups:
     MyGroup:
       - package1
       - package2
     Test:
       - '@org/*-ui' # any kind of pattern supported by pnpm is allowed
     Build:
       - pkg-core... # use X... to match dependencies of X or ...X to match dependents of X
   ```

## Usage

Instead of running `pnpm`, use `pnpmf` (or the shortcut `pf`) to select groups interactively.

```bash
# before
pnpm install

# after
pf install
```

```bash
# before
pnpm --parallel build

# after
pf --parallel build
```

### How it works

1. When you run `pf`, it prompts you to select one or more groups.
2. It then passes the selected packages as filters to `pnpm`.

For example:

```bash
pf install # selects Test and MyGroup

# Equivalent to:
pnpm -F package1 -F package2 -F @org/*-ui install
```

## License

MIT

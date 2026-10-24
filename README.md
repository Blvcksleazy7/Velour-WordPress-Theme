# Velour WordPress Theme

The custom WordPress and WooCommerce theme for The Velour Standard.

## Project structure

- `velour-standard/` - installable WordPress theme source.
- `tests/` - structural, security, interaction, and packaging tests.
- `scripts/package-theme.mjs` - creates an emergency/manual installer ZIP.
- `docs/` - migration, design, and implementation notes.

## Local verification

```bash
node scripts/package-theme.mjs
node --test tests/theme-structure.test.mjs tests/presence-profile.test.mjs
```

Generated ZIP files are deliberately not tracked. Git is the source of truth.

## Branch workflow

- `main` contains the latest reviewed release candidate.
- Feature work happens on short-lived branches.
- Staging should deploy from `main` only after tests pass.
- Production deployment remains a separate, explicit release step.

## Deployment

The intended deployment path is GitHub to the cPanel staging installation, using either cPanel Git Version Control or a narrowly scoped GitHub Actions deployment. Server paths and credentials must be configured outside this repository and must never be committed.


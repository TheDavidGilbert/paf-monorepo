# Royal Mail PAF Input Files

This directory is where you should place your Royal Mail Postcode Address File
(PAF) data.

## Required License

**Important**: You must obtain your own Royal Mail PAF license before using this
software with PAF data.

- Royal Mail PAF data is **not included** in this repository
- You are responsible for obtaining the appropriate license from Royal Mail
- Contact Royal Mail for licensing information: https://www.royalmail.com/

## Expected Directory Structure

```
input/
├── CSV PAF/
│   └── CSV PAF.csv               # Main PAF delivery point file (required)
└── CSV MULRES/
    └── CSV Multiple Residence.csv # Multiple Residence data (optional)
```

### CSV PAF (required)

The main Postcode Address File CSV. The builder reads this to produce the
address lookup dataset.

Default path: `input/CSV PAF/CSV PAF.csv`

A custom path can be specified with the `--input` flag:

```bash
pnpm build:builder --input /path/to/CSV PAF/CSV PAF.csv
```

### CSV MULRES (optional)

The Multiple Residence file links individual units (e.g. flats) to their parent
PAF delivery point via UDPRN. If this file is absent the builder completes
successfully without MR data and the API will not expand Multiple Residence
records.

## File Exclusions

All `.csv` files in this directory are excluded from git via `.gitignore` to
prevent accidental sharing of licensed data and to keep the repository
lightweight.

# Royal Mail PAF Input Files

This directory is where you should place your Royal Mail Postcode Address File (PAF) data.

## Required License

**Important**: You must obtain your own Royal Mail PAF license before using this software with PAF data.

- Royal Mail PAF data is **not included** in this repository
- You are responsible for obtaining the appropriate license from Royal Mail
- Contact Royal Mail for licensing information: https://www.royalmail.com/

## Expected Directory Structure

The builder expects CSV files in the following subdirectories:

```
input/
├── CSV PAF/
│   ├── CSV PAF.csv          # Main PAF file (required)
│   └── CSV PAF Welsh.csv    # Welsh addresses (optional)
├── CSV ALIAS/               # Address aliases (optional)
├── CSV BFPO/                # British Forces Post Office (optional)
├── CSV MULRES/              # Multiple residences (optional)
├── CSV PIF/                 # Postcode Information File (optional)
├── CSV POSTZON/             # Postcode zones (optional)
└── ... (other Royal Mail files)
```

## Getting Started

1. Obtain Royal Mail PAF data with appropriate license
2. Extract the CSV files into this `input/` directory
3. Place the main PAF file at: `input/CSV PAF/CSV PAF.csv`
4. Run the builder: `pnpm build:builder`

## File Exclusions

All `.csv` files in this directory are excluded from git via `.gitignore` to ensure:
- No accidental sharing of licensed data
- Compliance with Royal Mail licensing terms
- Repository remains lightweight

## Questions?

See the main [README.md](../../../README.md) for more information about the build process.

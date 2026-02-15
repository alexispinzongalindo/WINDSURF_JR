# Shuffle Import Recovery Notes

Date recovered: 2026-02-14
Workspace: /Users/alexispinzon/CascadeProjects/WINSURFJR

## What was recovered
- Source snapshot copied from:
  - /Users/alexispinzon/Downloads/shuffle
  - /Users/alexispinzon/Downloads/shuffle-2
- Stored in repo at:
  - /Users/alexispinzon/CascadeProjects/WINSURFJR/data/shuffle-imports/shuffle
  - /Users/alexispinzon/CascadeProjects/WINSURFJR/data/shuffle-imports/shuffle-2

## Reconstructed prior run context
- Previous Codex run had commands referencing:
  - shuffle-20260215-0148-35595.zip.download
  - shuffle-export.zip
  - unzip to shuffle-export directory
- Current machine scan did NOT find those zip artifacts now.
- Most likely: export zip existed during interrupted run but is no longer present (renamed, moved, or cleaned).

## Current source status
- Both folders are valid Shuffle exports.
- They are nearly identical; primary file diffs are cache-buster query values in script references.
- Main template content detected:
  - Title: BookFlow — Homepage
  - Hero: Smart scheduling for modern businesses

## Next practical step
- Use `shuffle-2/public/index.html` as the latest baseline template source and map sections into islaAPP template metadata/cards.

# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo uses a single-context domain-doc layout:

- `CONTEXT.md` at the repo root for shared project vocabulary and domain concepts.
- `docs/adr/` at the repo root for architectural decision records.

The client and server are part of the same product context, so skills should treat them as one domain unless this file is changed later.

## Before exploring, read these

- `CONTEXT.md` at the repo root.
- ADRs in `docs/adr/` that touch the area you are about to work in.

If any of these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. The `domain-modeling` skill, reached through `grill-with-docs` and `improve-codebase-architecture`, creates them lazily when terms or decisions actually get resolved.

## File structure

```text
/
|-- CONTEXT.md
|-- docs/
|   `-- adr/
|       |-- 0001-example-decision.md
|       `-- 0002-example-decision.md
|-- client/
`-- server/
```

## Use the glossary's vocabulary

When your output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If the concept you need is not in the glossary yet, either reconsider whether you are inventing language the project does not use, or note the gap for `domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it.

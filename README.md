# Shy Ghosts

A text-free logic puzzle by Pebblit Games: place one ghost in every room of a house. The ghosts
are shy, so none may see another along a row or column, and none may stand in a lamp's light.
Every house has exactly one solution and is solved by deduction, never by guessing. Phaser 3 +
TypeScript + Vite, for Playgama (web portals) and YouTube Playables.

Status: scaffold and core rules built (Epics 0–1, see docs/PROGRESS.md); no puzzles yet. The fun
gate comes first: Gate A (the puzzles ask for real deductions) and Gate B (a playtest of the
graybox) must pass before any art, sound or ads.

- Design: [GDD.md](GDD.md) · Rules, solver, grader, generator, Gate A: [GENERATOR.md](GENERATOR.md)
- Build brief: [briefs/shy-ghosts.md](briefs/shy-ghosts.md) · Epics and gates: [TASKS.md](TASKS.md)
- Where we are: [docs/PROGRESS.md](docs/PROGRESS.md) · Decisions: [docs/questions.md](docs/questions.md)
- Rules for agents: [CLAUDE.md](CLAUDE.md) · Skills: [docs/skills.md](docs/skills.md)

Commands (as the epics add them):

```sh
npm ci
npm run dev        # LAN dev server
npm test           # unit tests
npm run check      # types, lint, format
npm run levels     # rebuild the houses and the dailies (Epic 2)
npm run build      # dist/ + audit
npm run e2e        # dev build + Playwright
npm run zip        # submission ZIP + SHA-256 (Epic 6)
```

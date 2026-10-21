# Skills in this project

Which enabled skills apply to Shy Ghosts, at which step. Scanned 2026-10-21 against the session's
skill list. The game-trend skills read the creator profile in the planning repository
(`peek-and-find/game-trend-profile.md`).

## Use at these steps

| Step | Skill | What it does here | Status |
| --- | --- | --- | --- |
| Idea choice and market evidence | `game-trend-skills:brainstorming-game-ideas`, `scanning-game-trends`, `scouting-social-trends`, `evaluating-game-ideas` | The idea card (`peek-and-find/reports/2026-10-20-ideas.md`, idea C) and the evaluation (GO 29/35, kill switch) | done 2026-10-20 |
| Build brief | `game-trend-skills:writing-game-agent-briefs` | `briefs/shy-ghosts.md` | done 2026-10-20 |
| Design, feel, polish, the fun gate's judgment | `pebblit-game-craft` | Face, Feel, Flow, Fair, Share; the Feel spec (GDD §3a); Gate B's Flow and Fair scores; the feel audit (`references/juice.md` §1) in Epic 4 and before the release | in use (plan 2026-10-21) |
| Hold and pacing | `pebblit-retention` | The brief's Hold plan and minute map; the minute-map audit at the end of Epic 5 (brief M2: ≥ 7:00) and before the release; the pace question once real times exist | Epic 5, Epic 6 |
| Originality | `pebblit-game-dna` | The evaluation's distance (9 to a queens-style puzzle and to Meowdoku); re-checked on the finished art before the listing: no crowns, no stars, no colored-grid look | Epic 6 |
| Every epic end | `code-review`, then an independent adversarial audit subagent | Correctness first, then the rules, fairness and the platform; KRİTİK/YÜKSEK closed before the push; at Gate A the auditor also re-measures 200 houses (GENERATOR.md §9, A9) | every epic |
| Cloud sessions can build and test | `session-start-hook` | `.claude/hooks/session-start.sh` runs `npm install` in cloud sessions | Epic 0 |
| See the change in the real app | `run` | Launch the dev build and screenshot it when a test is not enough; the playtester's Gate B session | Epic 3 on |
| Visual pass | `design:design-critique`, `design:accessibility-review` | Rooms by pattern and lightness (not hue alone), the ghost states at phone size, contrast, 13+ and never baby-faced | Epic 4, Epic 6 |
| Icon and thumbnail | `anthropic-skills:canvas-design` (+ the kit's `scripts/thumbnails.mjs`) | The 128 px icon: one ghost peeking through its fingers, one lit window | Epic 6 |
| Store text | `design:ux-copy`, `brand-voice:brand-voice-enforcement` | The listing in the brand voice v1.2 (Pebblit Games, US English, no exclamation marks or superlatives, banned audience words); the hook "Every ghost wants to be alone." | Epic 6 |
| Submission day | `engineering:deploy-checklist` | Walk the certification checklist before the upload | Epic 6 |
| Launch | `game-trend-skills:launching-on-zero-budget` | Playgama sandbox, the share bonus, the hook clip (launch plan §4) | Epic 6 |
| After the launch | `game-trend-skills:tracking-game-metrics`, `product-management:metrics-review` | The brief's targets and the kill switch (≥ 300 plays: under 3:00 or under 40 % conversion after two fix releases) | post-launch |

## Not for this project

- `dusman-denetci`, `restore-safety`, `ikas-api`: the GeriAl (ikas) project's rules; the audit
  here is the pattern of Peek & Find and Munch Pixels (an independent subagent against
  GDD/GENERATOR/CLAUDE.md).
- `product-tracking-skills:*`: no external calls are allowed; analytics stays local.
- `unity:*`, `unreal-engine-*`: other engines.
- Document, office, finance, sales, marketing-automation and CRM skills: no step needs them.

/**
 * Words that name the rules, or name things by what they do (audit 2026-10-21, YÜKSEK 1, D63;
 * Gate B tune round 1, docs/gate-b-round1.md §7): the playtester reads `visible()` and gets no
 * rules, so its text names only shapes, colours, positions and poses. Whole words, any case;
 * shared by the unit test of `visibleText` and the e2e of the playtest mode.
 */
export const RULE_WORDS =
  /\b(?:rooms?|see|sees|seen|seeing|sight|lit|lights?|lamps?|sun|furniture|blocks?|blocked|residents?|calm|settles?|settled|shiver|shy|rules?|wrong|correct|conflicts?|solve|solved|solution|hints?|glow|glowing)\b/i;

/**
 * Words that state the rules (audit 2026-10-21, YÜKSEK 1; D63): the playtester reads `visible()`
 * and gets no rules, so its text describes only what is drawn. Shared by the unit test of
 * `visibleText` and the e2e of the playtest mode.
 */
export const RULE_WORDS =
  /\b(?:see|sees|seen|seeing|sight|lit|light|lights|lamp|lamps|furniture|resident|residents|calm|conflict|conflicts|solved|solution|rule|rules)\b/i;

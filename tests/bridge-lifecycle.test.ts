import { describe, expect, it } from 'vitest';
import {
  getPlatform,
  markInteractive,
  sentPlatformMessages,
  type Platform,
  type PlatformMessageName,
} from '../src/platform/bridge';

/**
 * CLAUDE.md rule 3: no title screen; the loading phase closes once, then GameReady, which the
 * platform sends at most once per page however often the Game becomes interactive.
 */
describe('markInteractive', () => {
  it('closes the loading phase once per page and asks for GameReady each time', () => {
    const sent: PlatformMessageName[] = [];
    const platform = {
      sendMessage: (name: PlatformMessageName) => {
        sent.push(name);
      },
    } as unknown as Platform;
    markInteractive(platform);
    expect(sent).toEqual(['in_game_loading_stopped', 'game_ready']);
    markInteractive(platform);
    expect(sent).toEqual(['in_game_loading_stopped', 'game_ready', 'game_ready']);
  });

  it('the platform (here its stub) sends GameReady at most once per page', () => {
    const platform = getPlatform();
    platform.sendMessage('in_game_loading_started');
    platform.sendMessage('game_ready');
    platform.sendMessage('game_ready');
    platform.sendMessage('gameplay_started');
    platform.sendMessage('game_ready');
    expect(sentPlatformMessages()).toEqual([
      'in_game_loading_started',
      'game_ready',
      'gameplay_started',
    ]);
  });
});

import { readState, writeState } from './timer-engine.js';

export function enableFlow(): void {
  const state = readState();
  writeState({ ...state, flowMode: true });
}

export function disableFlow(): void {
  const state = readState();
  writeState({ ...state, flowMode: false });
}

export function isFlowActive(): boolean {
  return readState().flowMode;
}

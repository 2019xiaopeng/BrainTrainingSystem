/**
 * useSoundEffects - Web Audio synth for game sound effects.
 * No audio files: every sound is generated with oscillators.
 */

import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

type SoundKind = 'click' | 'correct' | 'wrong' | 'finish' | 'record';

let ctx: AudioContext | null = null;
let resumeArmed = false;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();

  // Browsers block audio until a user gesture: resume on the first pointer/key event.
  if (!resumeArmed) {
    resumeArmed = true;
    const resume = () => {
      void ctx?.resume().catch(() => {});
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
  }
  return ctx;
}

interface ToneOptions {
  freq: number;
  /** Delay from now in seconds */
  at?: number;
  /** Seconds until silence */
  duration?: number;
  type?: OscillatorType;
  gain?: number;
}

function tone(ac: AudioContext, { freq, at = 0, duration = 0.15, type = 'sine', gain = 0.2 }: ToneOptions): void {
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const SOUNDS: Record<SoundKind, (ac: AudioContext) => void> = {
  // Tiny tick
  click: (ac) => tone(ac, { freq: 880, duration: 0.05, type: 'triangle', gain: 0.15 }),
  // Gentle ascending two-note
  correct: (ac) => {
    tone(ac, { freq: 523.25, duration: 0.12, gain: 0.2 });
    tone(ac, { freq: 659.25, at: 0.09, duration: 0.16, gain: 0.2 });
  },
  // Soft low two descending notes
  wrong: (ac) => {
    tone(ac, { freq: 293.66, duration: 0.14, gain: 0.18 });
    tone(ac, { freq: 220, at: 0.1, duration: 0.2, gain: 0.18 });
  },
  // Short ascending arpeggio
  finish: (ac) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone(ac, { freq, at: i * 0.09, duration: 0.18, gain: 0.18 })
    );
  },
  // Brighter chime variant (triangle waves add harmonics)
  record: (ac) => {
    [659.25, 830.61, 987.77, 1318.51].forEach((freq, i) =>
      tone(ac, { freq, at: i * 0.09, duration: 0.22, type: 'triangle', gain: 0.16 })
    );
  },
};

function play(kind: SoundKind): void {
  if (!useGameStore.getState().soundEnabled) return;
  const ac = getContext();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => {});
  SOUNDS[kind](ac);
}

export function useSoundEffects() {
  const playClick = useCallback(() => play('click'), []);
  const playCorrect = useCallback(() => play('correct'), []);
  const playWrong = useCallback(() => play('wrong'), []);
  const playFinish = useCallback(() => play('finish'), []);
  const playRecord = useCallback(() => play('record'), []);

  return { playClick, playCorrect, playWrong, playFinish, playRecord };
}

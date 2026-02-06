/**
 * useSoundEffects - Hook for playing game sound effects
 */

import { useCallback, useRef } from 'react';

export function useSoundEffects() {
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements on first use
  const initAudio = useCallback(() => {
    if (!clickSoundRef.current) {
      clickSoundRef.current = new Audio('/music/click.wav');
      clickSoundRef.current.volume = 0.3;
    }
    if (!correctSoundRef.current) {
      correctSoundRef.current = new Audio('/music/correct.mp3');
      correctSoundRef.current.volume = 0.4;
    }
    if (!wrongSoundRef.current) {
      wrongSoundRef.current = new Audio('/music/wrong.mp3');
      wrongSoundRef.current.volume = 0.4;
    }
  }, []);

  const playClick = useCallback(() => {
    initAudio();
    if (clickSoundRef.current) {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.play().catch(() => {
        // Ignore errors (e.g., user hasn't interacted with page yet)
      });
    }
  }, [initAudio]);

  const playCorrect = useCallback(() => {
    initAudio();
    if (correctSoundRef.current) {
      correctSoundRef.current.currentTime = 0;
      correctSoundRef.current.play().catch(() => {
        // Ignore errors
      });
    }
  }, [initAudio]);

  const playWrong = useCallback(() => {
    initAudio();
    if (wrongSoundRef.current) {
      wrongSoundRef.current.currentTime = 0;
      wrongSoundRef.current.play().catch(() => {
        // Ignore errors
      });
    }
  }, [initAudio]);

  return {
    playClick,
    playCorrect,
    playWrong,
  };
}

/**
 * setTimeout that never fires while the tab is hidden.
 * When it fires, if document.hidden it re-checks every 500ms until visible,
 * so no game round/event advances unseen (timers keep running in hidden tabs
 * while rAF/CSS animations are frozen).
 * Returns a cancel function (clears the pending timer).
 */
export function scheduleVisible(fn: () => void, delayMs: number, recheckMs = 500): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const fire = () => {
    if (document.hidden) {
      timer = setTimeout(fire, recheckMs);
      return;
    }
    fn();
  };
  timer = setTimeout(fire, delayMs);
  return () => {
    if (timer !== null) clearTimeout(timer);
  };
}

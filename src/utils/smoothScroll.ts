/**
 * Smoothly scrolls the main scrollable container (#kft-main-scroll) or modal scroll container
 * so that targetEl (the results section heading and first result card)
 * is positioned right near the top of the screen.
 */
export interface SmoothScrollOptions {
  containerEl?: HTMLElement | null;
  containerId?: string;
  targetId?: string;
  offsetTop?: number;
  delayMs?: number;
  onlyIfOutOfView?: boolean;
}

const activeAnimations = new WeakMap<HTMLElement, number>();
const activeVerifyTimers = new WeakMap<HTMLElement, number[]>();
const pendingStartRafs = new Map<string, number>();
const pendingStartTimers = new Map<string, number>();

function clearVerifyTimers(container: HTMLElement) {
  const timers = activeVerifyTimers.get(container);
  if (timers && typeof window !== 'undefined') {
    for (const id of timers) {
      window.clearTimeout(id);
    }
  }
  activeVerifyTimers.delete(container);
}

function cancelActiveScroll(container: HTMLElement) {
  const prevRaf = activeAnimations.get(container);
  if (prevRaf && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(prevRaf);
  }
  activeAnimations.delete(container);
  clearVerifyTimers(container);
}

function resolveLiveTarget(targetEl: HTMLElement | null | undefined, targetId?: string): HTMLElement | null {
  if (targetEl && targetEl.isConnected) {
    return targetEl;
  }
  const idToLookup = targetId || targetEl?.id;
  if (idToLookup && typeof document !== 'undefined') {
    return document.getElementById(idToLookup) as HTMLElement | null;
  }
  return targetEl || null;
}

function computeTargetScrollTop(
  container: HTMLElement,
  targetEl: HTMLElement,
  offsetTop: number
): number {
  const containerRect = container.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const relativeTop = targetRect.top - containerRect.top;
  const rawTop = container.scrollTop + relativeTop - offsetTop;
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
  return Math.max(0, Math.min(Math.round(rawTop), maxScroll));
}

function animateScrollToTarget(
  container: HTMLElement,
  targetEl: HTMLElement,
  offsetTop: number,
  targetId?: string,
  durationMs = 320
) {
  cancelActiveScroll(container);

  // Ensure CSS scroll-behavior: smooth does not conflict with per-frame rAF scrollTop updates
  container.style.scrollBehavior = 'auto';

  const startTop = container.scrollTop;
  const initialLiveTarget = resolveLiveTarget(targetEl, targetId);
  if (!initialLiveTarget) return;

  const initialTargetTop = computeTargetScrollTop(container, initialLiveTarget, offsetTop);
  if (Math.abs(initialTargetTop - startTop) < 2) {
    container.scrollTop = initialTargetTop;
    return;
  }

  let abortedByUser = false;
  const onUserInterrupt = () => {
    abortedByUser = true;
    cancelActiveScroll(container);
    cleanupListeners();
  };
  const cleanupListeners = () => {
    container.removeEventListener('touchstart', onUserInterrupt);
    container.removeEventListener('wheel', onUserInterrupt);
  };
  container.addEventListener('touchstart', onUserInterrupt, { passive: true, once: true });
  container.addEventListener('wheel', onUserInterrupt, { passive: true, once: true });

  const startTime = performance.now();
  const step = (now: number) => {
    if (abortedByUser) {
      cleanupListeners();
      return;
    }

    const liveTarget = resolveLiveTarget(targetEl, targetId);
    if (!liveTarget) {
      activeAnimations.delete(container);
      cleanupListeners();
      return;
    }

    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    // Re-read target position dynamically in case React finished rendering filtered cards
    const liveTargetTop = computeTargetScrollTop(container, liveTarget, offsetTop);
    const delta = liveTargetTop - startTop;
    // Cubic ease-out for smooth, natural mobile deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    container.scrollTop = Math.round(startTop + delta * eased);

    if (progress < 1) {
      const nextId = requestAnimationFrame(step);
      activeAnimations.set(container, nextId);
    } else {
      const finalTop = computeTargetScrollTop(container, liveTarget, offsetTop);
      container.scrollTop = finalTop;
      activeAnimations.delete(container);

      // Post-settle verification in case images or React state commit shifted layout height
      if (typeof window !== 'undefined' && !abortedByUser) {
        const verifyAt = (ms: number, cleanupAfter = false) =>
          window.setTimeout(() => {
            if (abortedByUser) return;
            const settledTarget = resolveLiveTarget(targetEl, targetId);
            if (settledTarget) {
              const settledTop = computeTargetScrollTop(container, settledTarget, offsetTop);
              if (Math.abs(container.scrollTop - settledTop) > 4) {
                container.scrollTop = settledTop;
              }
            }
            if (cleanupAfter) {
              cleanupListeners();
            }
          }, ms);

        activeVerifyTimers.set(container, [verifyAt(60, false), verifyAt(150, true)]);
      } else {
        cleanupListeners();
      }
    }
  };

  const rafId = requestAnimationFrame(step);
  activeAnimations.set(container, rafId);
}

export function smoothScrollToElement(
  targetEl: HTMLElement | null | undefined,
  options?: SmoothScrollOptions
): void {
  const offsetTop = options?.offsetTop ?? 6;
  const delayMs = options?.delayMs ?? 25;
  const targetId = options?.targetId || targetEl?.id;
  const scheduleKey = options?.containerId || targetId || 'kft-main-scroll';

  // Blur focused category button/select so mobile WebView focus-anchoring never pulls scroll back up
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    const tag = document.activeElement.tagName;
    if (tag === 'BUTTON' || tag === 'SELECT') {
      document.activeElement.blur();
    }
  }

  // Cancel any pending pre-scroll schedule for the same container/target
  const prevStartRaf = pendingStartRafs.get(scheduleKey);
  if (prevStartRaf && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(prevStartRaf);
    pendingStartRafs.delete(scheduleKey);
  }
  const prevStartTimer = pendingStartTimers.get(scheduleKey);
  if (prevStartTimer && typeof window !== 'undefined') {
    window.clearTimeout(prevStartTimer);
    pendingStartTimers.delete(scheduleKey);
  }

  const runScroll = () => {
    pendingStartTimers.delete(scheduleKey);
    const resolvedTarget = resolveLiveTarget(targetEl, targetId);
    if (!resolvedTarget) return;

    const findNearestScrollableAncestor = (el: HTMLElement | null): HTMLElement | null => {
      if (!el || typeof window === 'undefined') return null;

      // Any view inside the main app shell (#kft-main-scroll) must always scroll #kft-main-scroll,
      // never an inner wrapper with `overflow-x-hidden` (which browsers compute as `overflow-y: auto`).
      const mainShell = el.closest('#kft-main-scroll') as HTMLElement | null;
      if (mainShell) {
        return mainShell;
      }

      let cur: HTMLElement | null = el.parentElement;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        if (cur.id === 'kft-main-scroll') return cur;
        const style = window.getComputedStyle(cur);
        const overflowY = style?.overflowY || '';
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          cur.clientHeight > 0 &&
          cur.scrollHeight > cur.clientHeight + 2
        ) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const scrollContainer =
      options?.containerEl ||
      (options?.containerId && typeof document !== 'undefined'
        ? (document.getElementById(options.containerId) as HTMLElement | null)
        : null) ||
      findNearestScrollableAncestor(resolvedTarget) ||
      (typeof document !== 'undefined'
        ? (document.getElementById('kft-main-scroll') as HTMLElement | null)
        : null);

    if (scrollContainer) {
      animateScrollToTarget(scrollContainer, resolvedTarget, offsetTop, targetId, 320);
    } else {
      try {
        resolvedTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        resolvedTarget.scrollIntoView();
      }
    }
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    const rafId = window.requestAnimationFrame(() => {
      pendingStartRafs.delete(scheduleKey);
      const timerId = window.setTimeout(runScroll, delayMs);
      pendingStartTimers.set(scheduleKey, timerId);
    });
    pendingStartRafs.set(scheduleKey, rafId);
  } else {
    setTimeout(runScroll, delayMs);
  }
}
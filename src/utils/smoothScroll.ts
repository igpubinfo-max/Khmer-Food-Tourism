/**
 * Smoothly scrolls the main scrollable container (#kft-main-scroll)
 * so that targetEl (the results section heading and first result card)
 * is positioned right near the top of the screen.
 */
export interface SmoothScrollOptions {
  containerEl?: HTMLElement | null;
  containerId?: string;
  offsetTop?: number;
  delayMs?: number;
  onlyIfOutOfView?: boolean;
}

const activeAnimations = new WeakMap<HTMLElement, number>();

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
  durationMs = 320
) {
  const prevRaf = activeAnimations.get(container);
  if (prevRaf) {
    cancelAnimationFrame(prevRaf);
  }

  const startTop = container.scrollTop;
  const initialTargetTop = computeTargetScrollTop(container, targetEl, offsetTop);
  if (Math.abs(initialTargetTop - startTop) < 2) {
    container.scrollTop = initialTargetTop;
    return;
  }

  const startTime = performance.now();
  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    // Re-read target position dynamically in case React finished rendering filtered cards
    const liveTargetTop = computeTargetScrollTop(container, targetEl, offsetTop);
    const delta = liveTargetTop - startTop;
    // Cubic ease-out for smooth, natural mobile deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    container.scrollTop = Math.round(startTop + delta * eased);

    if (progress < 1) {
      const nextId = requestAnimationFrame(step);
      activeAnimations.set(container, nextId);
    } else {
      container.scrollTop = computeTargetScrollTop(container, targetEl, offsetTop);
      activeAnimations.delete(container);
    }
  };

  const rafId = requestAnimationFrame(step);
  activeAnimations.set(container, rafId);
}

export function smoothScrollToElement(
  targetEl: HTMLElement | null | undefined,
  options?: SmoothScrollOptions
): void {
  const offsetTop = options?.offsetTop ?? 8;
  const delayMs = options?.delayMs ?? 35;

  const runScroll = () => {
    if (!targetEl) return;
    const findNearestScrollableAncestor = (el: HTMLElement | null): HTMLElement | null => {
      if (!el || typeof window === 'undefined') return null;
      let cur: HTMLElement | null = el.parentElement;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        if (cur.id === 'kft-main-scroll') return cur;
        const style = window.getComputedStyle(cur);
        const overflowY = style?.overflowY || '';
        if ((overflowY === 'auto' || overflowY === 'scroll') && cur.clientHeight > 0) {
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
      findNearestScrollableAncestor(targetEl) ||
      (typeof document !== 'undefined'
        ? (document.getElementById('kft-main-scroll') as HTMLElement | null)
        : null);

    if (scrollContainer) {
      animateScrollToTarget(scrollContainer, targetEl, offsetTop, 320);
    } else {
      try {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        targetEl.scrollIntoView();
      }
    }
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      window.setTimeout(runScroll, delayMs);
    });
  } else {
    setTimeout(runScroll, delayMs);
  }
}

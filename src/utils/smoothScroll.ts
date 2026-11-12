/**
 * Smoothly scrolls a scrollable container (defaults to #kft-main-scroll)
 * so that 	argetEl is positioned clearly at the top of the visible area
 * (offsetTop pixels below the container's top edge).
 *
 * When onlyIfOutOfView: true is set (used for category button grids),
 * it never scrolls the category buttons off the top of the screen; it only
 * scrolls if the category grid is partially above the top edge so both the
 * 6 category buttons and the listings below remain in full view.
 */
export interface SmoothScrollOptions {
  containerEl?: HTMLElement | null;
  containerId?: string;
  offsetTop?: number;
  delayMs?: number;
  onlyIfOutOfView?: boolean;
}

const activeAnimations = new WeakMap<HTMLElement, number>();

function animateScrollTop(container: HTMLElement, targetTop: number, durationMs = 340) {
  const prevRaf = activeAnimations.get(container);
  if (prevRaf) {
    cancelAnimationFrame(prevRaf);
  }

  const startTop = container.scrollTop;
  const delta = targetTop - startTop;
  if (Math.abs(delta) < 2) {
    container.scrollTop = targetTop;
    return;
  }

  const startTime = performance.now();
  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    // Cubic ease-out for natural mobile deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    container.scrollTop = Math.round(startTop + delta * eased);
    if (progress < 1) {
      const nextId = requestAnimationFrame(step);
      activeAnimations.set(container, nextId);
    } else {
      container.scrollTop = targetTop;
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
  const offsetTop = options?.offsetTop ?? 10;
  const delayMs = options?.delayMs ?? 35;
  const onlyIfOutOfView = options?.onlyIfOutOfView ?? false;

  const runScroll = () => {
    if (!targetEl) return;
    const scrollContainer =
      options?.containerEl ||
      (typeof document !== 'undefined'
        ? (document.getElementById(options?.containerId || 'kft-main-scroll') as HTMLElement | null)
        : null);

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const relativeTop = targetRect.top - containerRect.top;

      // If onlyIfOutOfView is true and the category grid is already fully visible near the top,
      // do not scroll it off the top edge!
      if (onlyIfOutOfView && relativeTop >= 4 && relativeTop <= containerRect.height * 0.45) {
        return;
      }

      const rawTop = scrollContainer.scrollTop + relativeTop - offsetTop;
      const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
      const nextTop = Math.max(0, Math.min(Math.round(rawTop), maxScroll));

      const reducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reducedMotion) {
        animateScrollTop(scrollContainer, nextTop, 340);
      } else {
        try {
          scrollContainer.scrollTo({ top: nextTop, behavior: 'smooth' });
        } catch {
          animateScrollTop(scrollContainer, nextTop, 340);
        }
      }
    } else {
      try {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
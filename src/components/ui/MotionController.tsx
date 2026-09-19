'use client';

import { useEffect } from 'react';

/**
 * Progressive-enhancement motion layer.
 *
 * - `[data-reveal]` elements animate in once when they enter the viewport. The
 *   hidden start state only applies under `html.motion-ready`, which the inline
 *   head script sets; if this component never mounts, a failsafe reveals all.
 * - `[data-parallax]` layers follow scroll via the `--scroll` custom property.
 * - `[data-tilt]` cards get a pointer-driven 3D tilt + glare.
 * - `[data-magnetic]` buttons lean toward the pointer.
 * Everything is skipped under prefers-reduced-motion.
 */
export function MotionController() {
  useEffect(() => {
    const root = document.documentElement;
    (window as unknown as { __dvbMotion?: boolean }).__dvbMotion = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) {
      root.classList.remove('motion-ready');
      return;
    }

    // Reveal on enter. The long authored delays choreograph the first screen;
    // anything revealed later by scrolling gets a short local stagger instead.
    const start = performance.now();
    const io = new IntersectionObserver(
      (entries) => {
        const late = performance.now() - start > 1200;
        let n = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          if (late) el.style.setProperty('--d', `${n++ * 80}ms`);
          el.classList.add('is-in');
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    root.classList.add('motion-live');

    // Scroll-linked parallax (one rAF per frame)
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        root.style.setProperty('--scroll', String(window.scrollY));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Pointer effects (fine pointers only)
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cleanups: Array<() => void> = [];
    if (fine) {
      document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
        const move = (ev: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const x = (ev.clientX - r.left) / r.width;
          const y = (ev.clientY - r.top) / r.height;
          el.style.setProperty('--ry', `${(x - 0.5) * 7}deg`);
          el.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
          el.style.setProperty('--gx', `${x * 100}%`);
          el.style.setProperty('--gy', `${y * 100}%`);
        };
        const leave = () => {
          el.style.setProperty('--ry', '0deg');
          el.style.setProperty('--rx', '0deg');
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
        });
      });

      const onMagnet = (ev: PointerEvent) => {
        const el = (ev.target as Element | null)?.closest<HTMLElement>('[data-magnetic]');
        document.querySelectorAll<HTMLElement>('[data-magnetic].is-magnet').forEach((m) => {
          if (m !== el) {
            m.classList.remove('is-magnet');
            m.style.setProperty('--mx', '0px');
            m.style.setProperty('--my', '0px');
          }
        });
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.classList.add('is-magnet');
        el.style.setProperty('--mx', `${((ev.clientX - r.left) / r.width - 0.5) * 8}px`);
        el.style.setProperty('--my', `${((ev.clientY - r.top) / r.height - 0.5) * 6}px`);
      };
      document.addEventListener('pointermove', onMagnet, { passive: true });
      cleanups.push(() => document.removeEventListener('pointermove', onMagnet));
    }

    const onReduce = () => {
      if (reduce.matches) {
        document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
        root.classList.remove('motion-ready', 'motion-live');
      }
    };
    reduce.addEventListener('change', onReduce);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      reduce.removeEventListener('change', onReduce);
      cleanups.forEach((c) => c());
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}

/** Runs before first paint: opt into reveal start states, with a failsafe. */
export const motionBootScript = `(function(){try{var d=document.documentElement;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('motion-ready');setTimeout(function(){if(!window.__dvbMotion){d.classList.remove('motion-ready');}},4000);}catch(e){}})();`;

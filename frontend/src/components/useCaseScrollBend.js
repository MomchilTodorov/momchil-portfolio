import {useLayoutEffect} from 'react';
import {reducedMotionQuery} from './ProjectLink.jsx';
import {caseCamera, createCaseMediaProjection} from './caseMediaProjection.js';

const mediaSelector = '.case-media, .case-walkthrough, .case-examples figure > img';
const scrollEasing = .085;
const wheelSpeed = 1.2;

export default function useCaseScrollBend(column, canvas, projectSlug) {
  useLayoutEffect(() => {
    const element = column.current;
    const surface = canvas.current;
    if (!element || !surface || !projectSlug) return;

    const preference = window.matchMedia?.(reducedMotionQuery);
    const page = document.scrollingElement || document.documentElement;
    const panels = [...element.querySelectorAll(mediaSelector)];
    const projected = new Set();
    let renderer;
    let frame = null;
    let shownScroll = page.scrollTop;
    let position = shownScroll;
    let target = position;
    let velocity = 0;
    let gesture;

    function stopPainting() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      for (const panel of projected) panel.removeAttribute('data-case-projected');
      projected.clear();
      renderer?.clear();
    }

    function reset() {
      stopPainting();
      shownScroll = page.scrollTop;
      position = target = shownScroll;
      velocity = 0;
      gesture = undefined;
      if (renderer) element.dataset.caseDrag = '';
    }

    function hasMotion() {
      if (preference?.matches || document.hidden || !surface.clientWidth || !surface.clientHeight) return false;
      if (renderer === undefined) {
        renderer = createCaseMediaProjection(surface);
        if (renderer) element.dataset.caseDrag = '';
      }
      return Boolean(renderer);
    }

    function queuePaint() {
      if (frame === null) frame = requestAnimationFrame(paint);
    }

    function scrollTo(next) {
      const limit = page.scrollHeight - page.clientHeight;
      target = Math.max(0, Math.min(limit, next));
      if (target !== position) queuePaint();
    }

    function paint() {
      frame = null;
      const width = surface.clientWidth;
      const height = surface.clientHeight;
      const camera = caseCamera(width, height);
      const movement = (target - position) * scrollEasing;
      position += movement;
      velocity += (movement / camera.scale - velocity) * scrollEasing;

      if (Math.abs(target - position) < .1 && Math.abs(velocity) < .01) {
        page.scrollTop = target;
        shownScroll = page.scrollTop;
        target = position = shownScroll;
        velocity = 0;
        stopPainting();
        return;
      }

      page.scrollTop = position;
      shownScroll = page.scrollTop;
      const bend = Math.min(1, Math.abs(velocity) * (scrollEasing / 4));
      const offset = shownScroll - position;
      renderer.begin(width, height, bend, camera);

      for (const panel of panels) {
        const rect = panel.getBoundingClientRect();
        const video = panel.querySelector('video');
        const still = panel instanceof window.HTMLImageElement ? panel : panel.querySelector('img');
        const media = video?.readyState >= 2 && !video.hidden ? video : still;
        const drewPanel = rect.bottom + offset > -height / 2 && rect.top + offset < height * 1.5 && media
          && renderer.draw(media, rect, panel.querySelector('.project-cover-title'), offset);
        if (drewPanel && !projected.has(panel)) {
          panel.setAttribute('data-case-projected', '');
          projected.add(panel);
        } else if (!drewPanel && projected.delete(panel)) {
          panel.removeAttribute('data-case-projected');
        }
      }
      queuePaint();
    }

    function onWheel(event) {
      if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || !event.deltaY
        || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !hasMotion()) return;
      event.preventDefault();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1;
      const camera = caseCamera(surface.clientWidth, surface.clientHeight);
      scrollTo(target + event.deltaY * units * wheelSpeed * camera.scale);
    }

    function onKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || !['ArrowUp', 'ArrowDown'].includes(event.key) || event.target.closest?.('input, textarea, select, [contenteditable]')
        || !hasMotion()) return;
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const camera = caseCamera(surface.clientWidth, surface.clientHeight);
      scrollTo(target + direction * 100 * wheelSpeed * camera.scale);
    }

    function onPointerDown(event) {
      if (gesture || !event.isPrimary || event.button !== 0
        || event.target.closest('a, button') || !hasMotion()) return;
      gesture = {id: event.pointerId, start: event.clientY, target, active: false};
    }

    function onPointerMove(event) {
      if (gesture?.id !== event.pointerId) return;
      const distance = gesture.start - event.clientY;
      if (!gesture.active) {
        if (Math.abs(distance) < 4) return;
        element.setPointerCapture(event.pointerId);
        element.dataset.caseDrag = 'active';
        gesture.active = true;
      }
      const camera = caseCamera(surface.clientWidth, surface.clientHeight);
      const sensitivity = event.pointerType === 'touch' ? 3 : 1.5;
      scrollTo(gesture.target + distance * sensitivity * camera.scale);
    }

    function endGesture(event) {
      if (gesture?.id !== event.pointerId) return;
      gesture = undefined;
      element.dataset.caseDrag = '';
    }

    function onNativeScroll() {
      if (page.scrollTop === shownScroll) return;
      reset();
    }

    function onContextLost(event) {
      event.preventDefault();
      renderer = null;
      delete element.dataset.caseDrag;
      reset();
    }

    function onContextRestored() {
      renderer = undefined;
      hasMotion();
    }

    function onPreferenceChange() {
      reset();
      if (preference?.matches) delete element.dataset.caseDrag;
      else hasMotion();
    }

    hasMotion();
    window.addEventListener('wheel', onWheel, {passive: false});
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onNativeScroll, {passive: true});
    window.addEventListener('resize', reset);
    element.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endGesture);
    window.addEventListener('pointercancel', endGesture);
    element.addEventListener('lostpointercapture', endGesture);
    document.addEventListener('visibilitychange', reset);
    preference?.addEventListener('change', onPreferenceChange);
    surface.addEventListener('webglcontextlost', onContextLost);
    surface.addEventListener('webglcontextrestored', onContextRestored);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onNativeScroll);
      window.removeEventListener('resize', reset);
      element.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endGesture);
      window.removeEventListener('pointercancel', endGesture);
      element.removeEventListener('lostpointercapture', endGesture);
      document.removeEventListener('visibilitychange', reset);
      preference?.removeEventListener('change', onPreferenceChange);
      surface.removeEventListener('webglcontextlost', onContextLost);
      surface.removeEventListener('webglcontextrestored', onContextRestored);
      stopPainting();
      renderer?.dispose();
      delete element.dataset.caseDrag;
    };
  }, [column, canvas, projectSlug]);
}

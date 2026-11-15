import {useLayoutEffect, useRef, useState} from 'react';
import {prefersReducedMotion, reducedMotionQuery} from './ProjectLink.jsx';
import {createGalleryProjection} from './galleryProjection.js';

const frameLength = 1000 / 60;
const travelEasing = .085;
const entranceDuration = 1750;
const chromaLimit = .018;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const indexAt = (position, count) => ((Math.round(position) % count) + count) % count;

export function galleryOffset(index, position, count) {
  const offset = index - position;
  if (count < 3) return offset;
  return ((offset + count / 2) % count + count) % count - count / 2;
}

function stepWidth(element) {
  const width = element.clientWidth;
  return Math.max(220, width * (width <= 720 ? .785 : .535));
}

export default function useGalleryMotion(projects, initialProject, waitingForLoader, indicator) {
  const [activeSlug, setActiveSlug] = useState();
  const active = Math.max(0, projects.findIndex(project => project.slug === activeSlug));
  const projectOrder = projects.map(project => project.slug).join('/');
  const stage = useRef(null);
  const motion = useRef({
    position: 0, target: 0, speed: 0, frame: 0, activeIndex: 0, followPosition: false,
    pointer: null, hover: false, touchTravel: false, blockClickUntil: 0, cameraX: 0, cameraY: 0, cursorX: 0, cursorY: 0,
    shift: 0, stretch: 0,
    entrance: 1, entranceStarted: null, hasShownGallery: false,
  });
  const scene = motion.current;
  const count = projects.length;
  const arcStep = Math.PI / Math.max(count, 6);

  function updateActive(index) {
    if (scene.activeIndex === index) return;
    scene.activeIndex = index;
    setActiveSlug(projects[index].slug);
  }

  function paintCarousel() {
    const fadeEdge = count / 2;
    scene.slides.forEach((element, index) => {
      const offset = galleryOffset(index, scene.position, count);
      const distance = Math.abs(offset);
      const angle = offset * arcStep;
      // The radius is measured in slide steps so the same arc scales with the viewport.
      const arcX = Math.sin(angle) / arcStep;
      const depth = (1 - Math.cos(angle)) / arcStep;
      const scale = 1 - .35 * Math.min(1, Math.abs(angle) / (Math.PI / 2)) * scene.entrance;
      const opacity = count < 3 ? 1 : clamp((fadeEdge - distance) / (fadeEdge * .15), 0, 1);
      element.style.setProperty('--arc-x', offset + (arcX - offset) * scene.entrance);
      element.style.setProperty('--arc-yaw', `${angle * .8 * scene.entrance}rad`);
      element.style.setProperty('--arc-depth', depth * scene.entrance);
      element.style.setProperty('--arc-scale', scale);
      element.style.setProperty('--arc-opacity', opacity * scene.entrance);
      element.style.setProperty('--arc-light', .55 + .45 * scale);
      element.style.zIndex = Math.round(100 / (1 + distance));
    });
    stage.current?.style.setProperty('--entrance-scale', .75 + .25 * scene.entrance);
    if (indicator.current) {
      const progress = count > 2
        ? ((scene.position % count + count) % count) / count
        : scene.position / Math.max(1, count - 1);
      indicator.current.style.setProperty('--gallery-progress', progress);
      indicator.current.setAttribute('aria-valuenow', Math.round(progress * 100));
    }
    if (scene.followPosition && count) updateActive(indexAt(scene.position, count));
  }

  function paintSpeed() {
    const velocity = clamp(scene.speed, -70, 70);
    const speed = Math.abs(velocity);
    const chroma = clamp(velocity * .0022, -chromaLimit, chromaLimit);
    // The shader's offset is a fraction of the rendered cover width.
    const shift = Math.abs(chroma) > .0001 ? Math.round(chroma * scene.cardWidth * 100) / 100 : 0;
    const stretch = Math.min(speed * .001, .022);
    if (shift === scene.shift && stretch === scene.stretch) return;
    scene.shift = shift;
    scene.stretch = stretch;
    const element = stage.current;
    element.toggleAttribute('data-moving', shift !== 0);
    element.style.setProperty('--motion-stretch', 1 + stretch);
    element.style.setProperty('--motion-squash', 1 - stretch * .6);
    scene.red.setAttribute('dx', shift);
    scene.blue.setAttribute('dx', -shift);
  }

  function paintPointer(factor) {
    const element = stage.current;
    let moving = false;
    function ease(value, target) {
      if (Math.abs(target - value) < .002) return target;
      moving = true;
      return value + (target - value) * factor;
    }
    const cameraX = ease(scene.cameraX, scene.cursorX);
    const cameraY = ease(scene.cameraY, scene.cursorY);
    if (cameraX !== scene.cameraX || cameraY !== scene.cameraY) {
      scene.cameraX = cameraX;
      scene.cameraY = cameraY;
      element.style.setProperty('--camera-x', `${cameraX * .45}vw`);
      element.style.setProperty('--camera-y', `${cameraY * .5}svh`);
      element.style.setProperty('--camera-yaw', `${cameraX * 2.45}deg`);
      element.style.setProperty('--camera-pitch', `${cameraY * 2.5}deg`);
      element.style.setProperty('--light-x', `${50 - cameraX * 28}%`);
      element.style.setProperty('--light-y', `${42 - cameraY * 22}%`);
    }
    return moving;
  }

  function finishMotion() {
    cancelAnimationFrame(scene.frame);
    scene.frame = 0;
    scene.speed = 0;
    scene.entrance = 1;
    scene.position = scene.target;
    scene.projection?.hide();
    scene.hover = false;
    scene.cursorX = scene.cursorY = 0;
    paintCarousel();
    paintSpeed();
    paintPointer(1);
  }

  function animate() {
    if (prefersReducedMotion()) return finishMotion();
    if (scene.frame) return;
    scene.step = stepWidth(stage.current);
    scene.cardWidth = scene.slides[0]?.offsetWidth || scene.step;
    let previous;
    function tick(now) {
      const elapsed = previous == null ? frameLength : clamp(now - previous, 1, 50);
      previous = now;
      const pointerEasing = 1 - (1 - travelEasing) ** (elapsed / frameLength);
      const entrance = scene.entrance;
      if (entrance < 1) {
        scene.entranceStarted ??= now;
        const progress = (now - scene.entranceStarted) / entranceDuration;
        scene.entrance = progress >= 1 ? 1 : 1 - 2 ** (-10 * progress);
      }
      const position = scene.position;
      // Keep swipes responsive when a phone renders fewer frames.
      const slideEasing = scene.touchTravel ? pointerEasing : travelEasing;
      scene.position += (scene.target - position) * slideEasing;
      if (Math.abs(scene.target - scene.position) < .0005) scene.position = scene.target;
      const pixels = (scene.position - position) * scene.step;
      const velocity = scene.touchTravel ? pixels * frameLength / elapsed : pixels;
      scene.speed += (velocity - scene.speed) * slideEasing;
      if (Math.abs(scene.speed) < .01) scene.speed = 0;
      if (scene.position !== position || scene.entrance !== entrance) paintCarousel();
      paintSpeed();
      const pointerMoving = paintPointer(pointerEasing);
      const element = stage.current;
      const projectedMotion = scene.projection && !document.hidden && !document.querySelector('.about-dialog[open]') && scene.projection.frame({
        width: element.clientWidth, height: element.clientHeight,
        pointer: {x: scene.cursorX, y: scene.cursorY, hover: scene.hover && !scene.pointer?.dragging},
        velocity: scene.speed, entrance: scene.entrance,
        offset: index => galleryOffset(index, scene.position, count),
      });
      scene.frame = pointerMoving || projectedMotion || scene.position !== scene.target || scene.speed || scene.entrance < 1
        ? requestAnimationFrame(tick) : 0;
    }
    scene.frame = requestAnimationFrame(tick);
  }

  useLayoutEffect(() => {
    const requested = initialProject || activeSlug;
    const index = Math.max(0, projects.findIndex(project => project.slug === requested));
    const element = stage.current;
    scene.slides = [...(element?.querySelectorAll('.gallery-slide') ?? [])];
    scene.red = element?.querySelector('[data-shift="red"]');
    scene.blue = element?.querySelector('[data-shift="blue"]');
    scene.step = element ? stepWidth(element) : 0;
    scene.cardWidth = scene.slides[0]?.offsetWidth || scene.step;
    const playEntrance = element && !waitingForLoader && !scene.hasShownGallery && !initialProject && !prefersReducedMotion();
    scene.entrance = playEntrance ? 0 : 1;
    scene.entranceStarted = null;
    scene.position = scene.target = scene.activeIndex = index;
    scene.followPosition = false;
    scene.speed = 0;
    scene.pointer = null;
    scene.touchTravel = false;
    if (projects[index]) setActiveSlug(projects[index].slug);
    if (element) {
      if (!waitingForLoader) scene.hasShownGallery = true;
      element.removeAttribute('data-dragging');
      paintCarousel();
      paintSpeed();
      if (playEntrance) animate();
    }
    const preference = window.matchMedia?.(reducedMotionQuery);
    const mouseLayout = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const projectionCanvas = element?.parentElement.querySelector('.gallery-projection');
    function refreshProjection() {
      if (!projectionCanvas || waitingForLoader || preference?.matches || !mouseLayout?.matches) {
        scene.projection?.dispose();
        scene.projection = null;
        return;
      }
      scene.projection ??= createGalleryProjection(projectionCanvas, scene.slides);
      if (scene.projection) animate();
    }
    const onPreferenceChange = () => {
      if (preference.matches && element) finishMotion();
      refreshProjection();
    };
    function followPointer(event) {
      if (event.pointerType !== 'mouse' || scene.pointer || preference?.matches) return;
      const {x, y} = pointerPosition(element, event);
      scene.hover = true;
      scene.cursorX = x;
      scene.cursorY = y;
      animate();
    }
    function leaveWindow(event) {
      if (event.pointerType !== 'mouse' || event.relatedTarget || scene.pointer) return;
      scene.hover = false;
      scene.cursorX = scene.cursorY = 0;
      animate();
    }
    function repaintProjection() {
      if (scene.projection && !document.hidden) animate();
    }
    function restoreProjection() {
      scene.projection?.dispose();
      scene.projection = null;
      refreshProjection();
    }
    preference?.addEventListener?.('change', onPreferenceChange);
    mouseLayout?.addEventListener?.('change', refreshProjection);
    if (element) {
      window.addEventListener('pointermove', followPointer);
      window.addEventListener('pointerout', leaveWindow);
      window.addEventListener('resize', repaintProjection);
      document.addEventListener('visibilitychange', repaintProjection);
      document.addEventListener('close', repaintProjection, true);
      element.addEventListener('load', repaintProjection, true);
      element.addEventListener('loadeddata', repaintProjection, true);
      projectionCanvas?.addEventListener('webglcontextrestored', restoreProjection);
      refreshProjection();
    }
    return () => {
      preference?.removeEventListener?.('change', onPreferenceChange);
      mouseLayout?.removeEventListener?.('change', refreshProjection);
      window.removeEventListener('pointermove', followPointer);
      window.removeEventListener('pointerout', leaveWindow);
      window.removeEventListener('resize', repaintProjection);
      document.removeEventListener('visibilitychange', repaintProjection);
      document.removeEventListener('close', repaintProjection, true);
      element?.removeEventListener('load', repaintProjection, true);
      element?.removeEventListener('loadeddata', repaintProjection, true);
      projectionCanvas?.removeEventListener('webglcontextrestored', restoreProjection);
      cancelAnimationFrame(scene.frame);
      scene.frame = 0;
      scene.projection?.dispose();
      scene.projection = null;
    };
  }, [projectOrder, initialProject, waitingForLoader]);

  function travelTo(position, touch = false) {
    scene.followPosition = true;
    scene.touchTravel = touch;
    scene.target = count < 3 ? clamp(position, 0, count - 1) : position;
    animate();
  }

  function move(direction) {
    const position = Math.round(scene.target) + direction;
    const index = indexAt(position, count);
    scene.followPosition = false;
    scene.touchTravel = false;
    scene.target = count < 3 ? index : position;
    updateActive(index);
    animate();
    return index;
  }

  function onWheel(event) {
    if (count < 2 || scene.pointer?.dragging || event.ctrlKey) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    const element = stage.current;
    const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
    const distance = clamp(pixels * .6 / stepWidth(element), -2, 2);
    travelTo(scene.target + distance);
  }

  function onPointerDown(event) {
    if (count < 2 || event.button !== 0 || event.isPrimary === false) return;
    scene.blockClickUntil = 0;
    scene.pointer = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      step: stepWidth(event.currentTarget), start: scene.position, dragging: false,
      touch: event.pointerType === 'touch',
    };
  }

  function onPointerMove(event) {
    const element = event.currentTarget;
    const pointer = scene.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    if (!pointer.dragging) {
      const horizontal = Math.abs(dx);
      const vertical = Math.abs(event.clientY - pointer.y);
      if (pointer.touch ? Math.max(horizontal, vertical) < 6 : horizontal < 6 || horizontal <= vertical) return;
      pointer.dragging = true;
      scene.cursorX = scene.cursorY = 0;
      element.dataset.dragging = 'true';
      element.setPointerCapture?.(event.pointerId);
    }
    travelTo(pointer.start - dx * (pointer.touch ? 3 : 1.5) / pointer.step, pointer.touch);
  }

  function endPointer(event) {
    const pointer = scene.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    scene.pointer = null;
    if (!pointer.dragging) return;
    delete event.currentTarget.dataset.dragging;
    scene.blockClickUntil = performance.now() + 280;
  }

  function onPointerLeave() {
    if (!scene.pointer?.dragging) scene.pointer = null;
  }

  function onLostPointerCapture(event) {
    // Touch starts captured by the card and then transfers capture to the stage.
    if (event.target === event.currentTarget) endPointer(event);
  }

  function onProjectedClick(event) {
    if (!scene.projection || event.detail === 0 || event.button !== 0 || event.ctrlKey
      || event.shiftKey || event.metaKey || event.altKey) return;
    const {x, y} = pointerPosition(event.currentTarget, event);
    const picked = scene.projection.pick(x, y);
    const link = event.target.closest('.gallery-slide');
    if (picked === null || (picked < 0 && link && !link.hasAttribute('data-gallery-drawn'))) return;
    if (picked >= 0 && link === scene.slides[picked]) return;
    event.preventDefault();
    event.stopPropagation();
    if (picked >= 0 && performance.now() >= scene.blockClickUntil) scene.slides[picked]?.click();
  }

  return {
    active, stage, move, onWheel, onPointerDown, onPointerMove, onPointerLeave, onClickCapture: onProjectedClick,
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onLostPointerCapture,
    blocksClick: () => performance.now() < scene.blockClickUntil,
  };
}

function pointerPosition(stage, event) {
  const bounds = stage.parentElement.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / (bounds.width || 1) * 2 - 1, -1, 1),
    y: clamp((event.clientY - bounds.top) / (bounds.height || 1) * 2 - 1, -1, 1),
  };
}

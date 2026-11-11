import {useLayoutEffect, useRef, useState} from 'react';
import {prefersReducedMotion} from './ProjectLink.jsx';

const arcStep = .43;
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

export default function useGalleryMotion(projects, initialProject) {
  const [activeSlug, setActiveSlug] = useState();
  const active = Math.max(0, projects.findIndex(project => project.slug === activeSlug));
  const projectOrder = projects.map(project => project.slug).join('/');
  const stage = useRef(null);
  const motion = useRef({
    position: 0, target: 0, speed: 0, frame: 0, activeIndex: 0, followPosition: false,
    pointer: null, blockClickUntil: 0, cameraX: 0, cameraY: 0, cursorX: 0, cursorY: 0,
    shift: 0,
  });
  const scene = motion.current;
  const count = projects.length;

  function updateActive(index) {
    if (scene.activeIndex === index) return;
    scene.activeIndex = index;
    setActiveSlug(projects[index].slug);
  }

  function paintCarousel() {
    const fadeEdge = Math.min(count / 2, 1.95);
    scene.slides.forEach((element, index) => {
      const offset = galleryOffset(index, scene.position, count);
      const distance = Math.abs(offset);
      const angle = offset * arcStep;
      const depth = (1 - Math.cos(angle)) / (1 - Math.cos(arcStep));
      const opacity = count < 3 ? 1 : clamp((fadeEdge - distance) / (fadeEdge - 1), 0, 1);
      element.style.setProperty('--arc-x', Math.sin(angle) / Math.sin(arcStep));
      element.style.setProperty('--arc-yaw', `${offset * 21}deg`);
      element.style.setProperty('--arc-depth', Math.min(depth, 2.2));
      element.style.setProperty('--arc-opacity', opacity);
      element.style.setProperty('--arc-light', 1 - Math.min(distance, 1) * .3);
      element.style.zIndex = Math.round(100 / (1 + distance));
    });
    if (scene.followPosition && count) updateActive(indexAt(scene.position, count));
  }

  function paintSpeed() {
    const strength = clamp(scene.speed / .11, -1, 1);
    const shift = Math.round(strength * scene.maxShift * 4) / 4;
    if (shift === scene.shift) return;
    scene.shift = shift;
    const element = stage.current;
    const magnitude = Math.abs(shift) / scene.maxShift;
    element.toggleAttribute('data-moving', shift !== 0);
    element.style.setProperty('--motion-stretch', 1 + magnitude * .055);
    element.style.setProperty('--motion-squash', 1 - magnitude * .032);
    element.style.setProperty('--motion-skew', `${strength * 1.7}deg`);
    scene.red.setAttribute('dx', shift);
    scene.blue.setAttribute('dx', -shift);
    scene.blur.setAttribute('stdDeviation', `${magnitude * .8} 0`);
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
      element.style.setProperty('--camera-yaw', `${cameraX * 1.7}deg`);
      element.style.setProperty('--camera-pitch', `${cameraY * -1.35}deg`);
      element.style.setProperty('--light-x', `${50 - cameraX * 28}%`);
      element.style.setProperty('--light-y', `${42 - cameraY * 22}%`);
    }
    return moving;
  }

  function animate() {
    if (prefersReducedMotion()) {
      cancelAnimationFrame(scene.frame);
      scene.frame = 0;
      scene.speed = 0;
      scene.position = scene.target;
      scene.cursorX = scene.cursorY = 0;
      paintCarousel();
      paintSpeed();
      paintPointer(1);
      return;
    }
    if (scene.frame) return;
    scene.maxShift = clamp(stage.current.clientWidth * .012, 4, 14);
    let previous;
    function tick(now) {
      const elapsed = previous == null ? 16 : clamp(now - previous, 1, 40);
      previous = now;
      const easing = 1 - Math.exp(-elapsed / 110);
      const position = scene.position;
      scene.position += (scene.target - position) * easing;
      if (Math.abs(scene.target - scene.position) < .0005) scene.position = scene.target;
      const velocity = (scene.position - position) * 16 / elapsed;
      scene.speed += (velocity - scene.speed) * (1 - Math.exp(-elapsed / 35));
      if (Math.abs(scene.speed) < .0007) scene.speed = 0;
      if (scene.position !== position) paintCarousel();
      paintSpeed();
      const pointerMoving = paintPointer(easing);
      scene.frame = pointerMoving || scene.position !== scene.target || scene.speed
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
    scene.blur = element?.querySelector('feGaussianBlur');
    scene.maxShift = clamp((element?.clientWidth ?? 0) * .012, 4, 14);
    scene.position = scene.target = scene.activeIndex = index;
    scene.followPosition = false;
    scene.speed = 0;
    scene.pointer = null;
    if (projects[index]) setActiveSlug(projects[index].slug);
    if (element) {
      element.removeAttribute('data-dragging');
      paintCarousel();
      paintSpeed();
    }
    return () => {
      cancelAnimationFrame(scene.frame);
      scene.frame = 0;
    };
  }, [projectOrder, initialProject]);

  function travelTo(position) {
    scene.followPosition = true;
    scene.target = count < 3 ? clamp(position, 0, count - 1) : position;
    animate();
  }

  function move(direction) {
    const position = Math.round(scene.target) + direction;
    const index = indexAt(position, count);
    scene.followPosition = false;
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
    const distance = clamp(pixels / stepWidth(element), -2, 2);
    travelTo(scene.target + distance);
  }

  function onPointerDown(event) {
    if (count < 2 || event.button !== 0 || event.isPrimary === false) return;
    scene.blockClickUntil = 0;
    scene.pointer = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      step: stepWidth(event.currentTarget), start: scene.position, dragging: false,
    };
  }

  function onPointerMove(event) {
    const element = event.currentTarget;
    const pointer = scene.pointer;
    if (!pointer) {
      if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
      const bounds = element.parentElement.getBoundingClientRect();
      scene.cursorX = clamp((event.clientX - bounds.left) / (bounds.width || 1) * 2 - 1, -1, 1);
      scene.cursorY = clamp((event.clientY - bounds.top) / (bounds.height || 1) * 2 - 1, -1, 1);
      animate();
      return;
    }
    if (pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    if (!pointer.dragging) {
      if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(event.clientY - pointer.y)) return;
      pointer.dragging = true;
      scene.cursorX = scene.cursorY = 0;
      element.dataset.dragging = 'true';
      element.setPointerCapture?.(event.pointerId);
    }
    travelTo(pointer.start - dx / pointer.step);
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
    scene.cursorX = scene.cursorY = 0;
    animate();
  }

  return {
    active, stage, move, onWheel, onPointerDown, onPointerMove, onPointerLeave,
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onLostPointerCapture: endPointer,
    blocksClick: () => performance.now() < scene.blockClickUntil,
  };
}

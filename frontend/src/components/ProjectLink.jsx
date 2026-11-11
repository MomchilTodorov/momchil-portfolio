import {flushSync} from 'react-dom';
import {Link, useNavigate} from 'react-router-dom';

export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  return window.matchMedia?.(reducedMotionQuery)?.matches ?? false;
}

export default function ProjectLink({to, state, motion, onClick, ...props}) {
  const navigate = useNavigate();

  function handleClick(event) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey
      || event.shiftKey || event.altKey || (props.target && props.target !== '_self')) return;
    if (!document.startViewTransition || prefersReducedMotion()) return;

    event.preventDefault();
    const root = document.documentElement;
    if (root.dataset.projectMotion) return;
    const source = motion === 'open' && (
      event.currentTarget.querySelector('.gallery-surface')
      || document.querySelector('.gallery-slide[data-position="0"] .gallery-surface')
    );
    if (source) source.setAttribute('data-transition-source', '');
    root.dataset.projectMotion = motion;

    const update = () => {
      flushSync(() => navigate(to, {state}));
      window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    };
    const clear = () => {
      delete root.dataset.projectMotion;
      if (source) source.removeAttribute('data-transition-source');
    };
    try {
      const transition = document.startViewTransition(update);
      transition.ready.catch(() => {});
      transition.finished.then(clear, clear);
    } catch {
      clear();
      update();
    }
  }

  return <Link to={to} state={state} onClick={handleClick} {...props}/>;
}

import '@testing-library/jest-dom';
import { act } from 'react';

class PointerEvent extends Event {
  constructor(type, props) {
    super(type, props);
    if (props) {
      this.clientX = props.clientX || 0;
      this.clientY = props.clientY || 0;
      this.pointerId = props.pointerId || 0;
      this.pointerType = props.pointerType || 'mouse';
    }
  }
}

globalThis.PointerEvent = PointerEvent;
globalThis.HTMLElement.prototype.scrollIntoView = jest.fn();
globalThis.HTMLElement.prototype.releasePointerCapture = jest.fn();
globalThis.HTMLElement.prototype.hasPointerCapture = jest.fn();

globalThis.act = act;

globalThis.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

globalThis.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
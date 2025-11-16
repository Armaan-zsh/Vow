import '@testing-library/jest-dom';
import { act } from 'react';

// Polyfill missing APIs
class PointerEvent extends Event {
  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.clientX = props.clientX || 0;
    this.clientY = props.clientY || 0;
    this.pointerId = props.pointerId || 0;
    this.pointerType = props.pointerType || 'mouse';
  }
  clientX: number = 0;
  clientY: number = 0;
  pointerId: number = 0;
  pointerType: string = 'mouse';
}
globalThis.PointerEvent = PointerEvent as any;
globalThis.IntersectionObserver = class { observe() {}; disconnect() {}; unobserve() {}; takeRecords() { return []; } } as any;
globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} } as any;

// Auto-mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, ...props }: any) => React.createElement('div', props, children),
    span: ({ children, ...props }: any) => React.createElement('span', props, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Fake timers everywhere
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

import '@testing-library/jest-dom';
import { act } from 'react';
import React from 'react';

// FIX 1: Polyfill ALL missing JSDOM APIs before any test runs
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
globalThis.IntersectionObserver = class {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return []; }
} as any;

globalThis.ResizeObserver = class {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// FIX 2: Use React 18 act globally to prevent deprecation warnings
globalThis.act = act;

// FIX 3: FRAMER MOTION AUTO-MOCK - prevents whileHover/whileTap warnings
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, ...props }: any) => 
      React.createElement('div', props, children),
    span: ({ children, ...props }: any) => 
      React.createElement('span', props, children),
    button: ({ children, ...props }: any) => 
      React.createElement('button', props, children),
    article: ({ children, whileHover, whileTap, ...props }: any) => 
      React.createElement('article', props, children),
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));

// FIX 4: Fake timers for ALL tests by default
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
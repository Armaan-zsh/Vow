import '@testing-library/jest-dom';
import { act } from 'react';
import React from 'react';

// =====================================================================
// FIX 1: Polyfill ALL missing JSDOM APIs (PointerEvent, IntersectionObserver, etc.)
// =====================================================================
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
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
} as any;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
} as any;

// =====================================================================
// FIX 2: Auto-mock Framer Motion to prevent whileHover/whileTap warnings
// Note: The actual mock is in __mocks__/framer-motion.ts for proper hoisting
// =====================================================================
jest.mock('framer-motion');

// =====================================================================
// FIX 3: Use React 18 act to prevent deprecation warnings
// =====================================================================
(globalThis as any).act = act;

// =====================================================================
// FIX 4: Fake timers for ALL tests to prevent timestamp flakiness
// =====================================================================
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

afterEach(() => {
  // Fake timers are enabled globally, so we can safely run pending timers
  try {
    jest.runOnlyPendingTimers();
  } catch (e) {
    // Ignore if timers aren't enabled for this test
  }
  jest.useRealTimers();
});


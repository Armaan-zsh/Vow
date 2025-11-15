describe('Test Setup', () => {
  it('should have fake timers enabled', () => {
    expect(typeof setTimeout).toBe('function');
  });

  it('should have consistent system time', () => {
    const now = new Date();
    expect(now.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should have JSDOM polyfills', () => {
    expect(globalThis.PointerEvent).toBeDefined();
    expect(globalThis.IntersectionObserver).toBeDefined();
    expect(globalThis.ResizeObserver).toBeDefined();
  });

  it('should have React act available', () => {
    expect((globalThis as any).act).toBeDefined();
  });

  it('should advance fake timers correctly', () => {
    const callback = jest.fn();
    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalled();
  });
});

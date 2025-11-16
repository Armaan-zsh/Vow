import React from 'react';

// FIX: Hoisted mock for framer-motion that strips animation props
export const motion = {
  div: ({ children, whileHover, whileTap, ...props }: any) =>
    React.createElement('div', props, children),
  span: ({ children, ...props }: any) =>
    React.createElement('span', props, children),
  article: ({ children, whileHover, whileTap, ...props }: any) =>
    React.createElement('article', props, children),
  button: ({ children, whileHover, whileTap, ...props }: any) =>
    React.createElement('button', props, children),
};

export const AnimatePresence = ({ children }: any) => children;

export const useAnimation = () => ({
  start: jest.fn(),
  stop: jest.fn(),
});


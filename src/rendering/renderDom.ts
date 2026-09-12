import type React from 'react';

import type { ResolvedElement } from '../types/layout';

export const elementStyle = (
  e: ResolvedElement,
): React.CSSProperties => ({
  position: 'absolute',

  left: e.x,

  top: e.y,

  width: e.width,

  height: e.height,

  zIndex: e.zIndex,

  boxSizing: 'border-box',

  /*
   * A resolved truncation decision is rendered as a single line.
   *
   * Normal text keeps the browser's normal wrapping behavior.
   * Truncated text has already been bounded by the resolver, so it should
   * not be allowed to wrap a second time inside the same resolved box.
   */
  ...(e.truncated
    ? { whiteSpace: 'nowrap' }
    : {}),
});

export function displayText(
  e: ResolvedElement,
): string {
  const text = e.text ?? '';

  if (
    !e.truncated ||
    !e.fontSize
  ) {
    return text;
  }

  /*
   * The resolver has explicitly decided that this element must be
   * truncated.
   *
   * Use the same conservative character-width model used by the resolver
   * so the resulting string remains inside the resolved width.
   */
  const characterWidth =
    e.fontSize *
    0.58 *
    1.12;

  const capacity = Math.max(
    1,
    Math.floor(
      e.width /
        characterWidth,
    ) - 1,
  );

  return (
    text
      .slice(0, capacity)
      .trimEnd() +
    '…'
  );
}
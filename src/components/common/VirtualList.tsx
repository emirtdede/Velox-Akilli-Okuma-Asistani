/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Lightweight virtual list component for rendering large lists efficiently.
 * Only renders items visible in the viewport plus a small overscan buffer,
 * dramatically reducing DOM node count for lists with 100+ items.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  /** The full array of items to render */
  items: T[];
  /** Fixed height of each item row in pixels */
  itemHeight: number;
  /** Maximum visible height of the scrollable container in pixels */
  containerHeight: number;
  /** Number of extra items to render above/below the visible area */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Optional className for the outer scroll container */
  className?: string;
  /** Unique key extractor for each item */
  keyExtractor: (item: T, index: number) => string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  className = '',
  keyExtractor
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length, Math.floor(scrollTop / itemHeight) + visibleCount + overscan);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  // If the list is small enough, skip virtualization entirely
  if (items.length * itemHeight <= containerHeight) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={keyExtractor(item, index)} style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
    >
      {/* Spacer to maintain correct scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Only render visible items */}
        <div
          style={{
            position: 'absolute',
            top: startIndex * itemHeight,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, i) => {
            const actualIndex = startIndex + i;
            return (
              <div key={keyExtractor(item, actualIndex)} style={{ height: itemHeight }}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

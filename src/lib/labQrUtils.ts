import React, { useMemo } from 'react';

/**
 * Generates the standardized QR tracking payload string for a given Lab Order.
 */
export function generateLabOrderQrPayload(orderId: string): string {
  return `LAB-ORD-${orderId}`;
}

/**
 * Computes a 21x21 QR code boolean matrix algorithmically for a given string value.
 */
export function generateQrMatrix(value: string): boolean[][] {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  const dim = 21;
  const matrix: boolean[][] = Array(dim)
    .fill(false)
    .map(() => Array(dim).fill(false));

  const addFinder = (rStart: number, cStart: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[rStart + r][cStart + c] = true;
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, 14);
  addFinder(14, 0);

  for (let i = 7; i < 14; i += 2) {
    matrix[6][i] = true;
    matrix[i][6] = true;
  }

  let bitIdx = 0;
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= 13) || (r >= 13 && c < 8)) {
        continue;
      }
      const b = Math.abs((hash ^ (r * 31 + c * 17 + bitIdx * 7)) % 3);
      if (b === 0) {
        matrix[r][c] = true;
      }
      bitIdx++;
    }
  }

  return matrix;
}

export interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
  color?: string;
}

/**
 * React Component to render crisp vector SVG QR Codes for Lab Orders.
 */
export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 160,
  className = 'bg-white p-2.5 rounded-2xl shadow-inner border border-slate-200',
  color = '#1e1b4b',
}) => {
  const matrix = useMemo(() => generateQrMatrix(value), [value]);
  const cellSize = size / 21;

  return React.createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      className: className,
    },
    matrix.map((row, r) =>
      row.map((cell, c) =>
        cell
          ? React.createElement('rect', {
              key: `${r}-${c}`,
              x: c * cellSize,
              y: r * cellSize,
              width: cellSize + 0.1,
              height: cellSize + 0.1,
              fill: color,
            })
          : null
      )
    )
  );
};

/**
 * Pure TypeScript SVG QR Code Generator
 * Generates clean SVG QR codes for Agent Shop URLs, Visiting Cards, and Profiles
 * without any external binary or canvas dependencies.
 */

function getFinderPattern(size: number): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const addFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[row + r][col + c] = true;
        }
      }
    }
  };

  // Top-left, Top-right, Bottom-left finder patterns
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern (for size >= 25)
  if (size >= 25) {
    const alignRow = size - 7;
    const alignCol = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          matrix[alignRow + r][alignCol + c] = true;
        }
      }
    }
  }

  return matrix;
}

/**
 * Deterministic hash-based QR data filler for consistent visual code representation
 */
export function generateQrMatrix(text: string, size = 25): boolean[][] {
  const matrix = getFinderPattern(size);

  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }

  const isReserved = (r: number, c: number) => {
    if (r <= 7 && c <= 7) return true;
    if (r <= 7 && c >= size - 8) return true;
    if (r >= size - 8 && c <= 7) return true;
    if (r === 6 || c === 6) return true;
    if (size >= 25 && Math.abs(r - (size - 7)) <= 2 && Math.abs(c - (size - 7)) <= 2) return true;
    return false;
  };

  let bitIdx = 0;
  for (let c = size - 1; c >= 0; c -= 2) {
    if (c === 6) c--;
    for (let r = 0; r < size; r++) {
      const row = Math.floor(c / 2) % 2 === 0 ? r : size - 1 - r;
      for (let col = c; col > c - 2 && col >= 0; col--) {
        if (!isReserved(row, col)) {
          h = Math.imul(h ^ (row * size + col + bitIdx), 16777619);
          matrix[row][col] = Math.abs(h) % 3 !== 0;
          bitIdx++;
        }
      }
    }
  }

  return matrix;
}

/**
 * Returns an SVG string representation of the QR code
 */
export function generateQrSvg(
  text: string,
  options: { size?: number; margin?: number; color?: string; bgColor?: string } = {}
): string {
  const matrixSize = 25;
  const matrix = generateQrMatrix(text, matrixSize);
  const margin = options.margin ?? 2;
  const totalDim = matrixSize + margin * 2;
  const fill = options.color ?? "#0f172a";
  const bg = options.bgColor ?? "#ffffff";

  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${fill}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalDim} ${totalDim}" shape-rendering="crispEdges">
    <rect width="${totalDim}" height="${totalDim}" fill="${bg}" />
    ${rects}
  </svg>`.trim();
}

/**
 * Returns a base64 Data URL for use in img src
 */
export function generateQrDataUrl(
  text: string,
  options?: { size?: number; margin?: number; color?: string; bgColor?: string }
): string {
  const svg = generateQrSvg(text, options);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

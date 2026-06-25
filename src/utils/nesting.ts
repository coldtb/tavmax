export interface NestingPartInput {
  id: string;
  name: string;
  width: number; // in mm
  height: number; // in mm
  quantity: number;
  materialId: string;
}

export interface PlacedPart {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface NestedSheet {
  sheetId: number;
  width: number;
  height: number;
  parts: PlacedPart[];
  usedArea: number; // sq mm
  wasteArea: number; // sq mm
  efficiency: number; // percentage (0 - 100)
  localSheetId?: number;
}

interface NestingOptions {
  sheetWidth: number;
  sheetHeight: number;
  kerf: number; // cutting blade thickness (usually 3-4mm)
  margin: number; // edge trim margin (usually 10mm)
  allowRotation: boolean;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * High-efficiency 2D Multi-Sheet Maximal Rectangles (MaxRects) First-Fit Packing Algorithm.
 * Packs parts into sheets, back-filling smaller parts across all previous sheets using the
 * Best Short Side Fit (BSSF) heuristic to minimize waste area and sheet count.
 */
export const runNestingOptimizer = (
  partsInput: NestingPartInput[],
  options: NestingOptions
): NestedSheet[] => {
  const { sheetWidth, sheetHeight, kerf, margin, allowRotation } = options;

  // 1. Flatten parts based on quantity
  const flatParts: { id: string; name: string; w: number; h: number; originalId: string }[] = [];
  partsInput.forEach((p) => {
    for (let q = 0; q < p.quantity; q++) {
      flatParts.push({
        id: `${p.id}-${q}`,
        originalId: p.id,
        name: p.name,
        w: p.width,
        h: p.height,
      });
    }
  });

  // Sort parts by area descending for a better pack rate (Best-Fit-Decreasing)
  flatParts.sort((a, b) => (b.w * b.h) - (a.w * a.h));

  interface InternalSheet {
    sheetId: number;
    width: number;
    height: number;
    parts: PlacedPart[];
    freeRects: FreeRect[];
  }

  const sheets: InternalSheet[] = [];
  const usableWidth = sheetWidth - margin * 2;
  const usableHeight = sheetHeight - margin * 2;

  const createNewSheet = (id: number): InternalSheet => ({
    sheetId: id,
    width: sheetWidth,
    height: sheetHeight,
    parts: [],
    // Start with a single free rectangle representing the entire usable board.
    // To handle kerf gracefully:
    // Any part placed at (x, y) with size (pw, ph) will occupy [x, x + pw + kerf] and [y, y + ph + kerf].
    // To prevent it from going out of the sheet, the initial free space is inflated by +kerf
    // so that a part of width pw + kerf can fit up to usableWidth + kerf.
    freeRects: [
      {
        x: 0,
        y: 0,
        w: usableWidth + kerf,
        h: usableHeight + kerf,
      },
    ],
  });

  const scorePlacement = (freeRect: FreeRect, pw: number, ph: number) => {
    if (pw > freeRect.w || ph > freeRect.h) {
      return { score1: Infinity, score2: Infinity };
    }
    const leftoverW = freeRect.w - pw;
    const leftoverH = freeRect.h - ph;
    const score1 = Math.min(leftoverW, leftoverH);
    const score2 = Math.max(leftoverW, leftoverH);
    return { score1, score2 };
  };

  const splitFreeRect = (freeRect: FreeRect, placedRect: FreeRect): FreeRect[] => {
    // Check if there is overlap
    if (
      placedRect.x >= freeRect.x + freeRect.w ||
      placedRect.x + placedRect.w <= freeRect.x ||
      placedRect.y >= freeRect.y + freeRect.h ||
      placedRect.y + placedRect.h <= freeRect.y
    ) {
      return [freeRect];
    }

    const result: FreeRect[] = [];

    // Split top
    if (placedRect.y > freeRect.y && placedRect.y < freeRect.y + freeRect.h) {
      result.push({
        x: freeRect.x,
        y: freeRect.y,
        w: freeRect.w,
        h: placedRect.y - freeRect.y,
      });
    }

    // Split bottom
    if (placedRect.y + placedRect.h > freeRect.y && placedRect.y + placedRect.h < freeRect.y + freeRect.h) {
      result.push({
        x: freeRect.x,
        y: placedRect.y + placedRect.h,
        w: freeRect.w,
        h: (freeRect.y + freeRect.h) - (placedRect.y + placedRect.h),
      });
    }

    // Split left
    if (placedRect.x > freeRect.x && placedRect.x < freeRect.x + freeRect.w) {
      result.push({
        x: freeRect.x,
        y: freeRect.y,
        w: placedRect.x - freeRect.x,
        h: freeRect.h,
      });
    }

    // Split right
    if (placedRect.x + placedRect.w > freeRect.x && placedRect.x + placedRect.w < freeRect.x + freeRect.w) {
      result.push({
        x: placedRect.x + placedRect.w,
        y: freeRect.y,
        w: (freeRect.x + freeRect.w) - (placedRect.x + placedRect.w),
        h: freeRect.h,
      });
    }

    return result;
  };

  const updateFreeRects = (sheet: InternalSheet, placedRect: FreeRect) => {
    const newFreeRects: FreeRect[] = [];
    for (const freeRect of sheet.freeRects) {
      const splits = splitFreeRect(freeRect, placedRect);
      for (const split of splits) {
        newFreeRects.push(split);
      }
    }

    // Prune nested and duplicate free rectangles
    const prunedFreeRects: FreeRect[] = [];
    for (let i = 0; i < newFreeRects.length; i++) {
      let isContained = false;
      for (let j = 0; j < newFreeRects.length; j++) {
        if (i === j) continue;
        const a = newFreeRects[i];
        const b = newFreeRects[j];

        // Exact match check to keep only one copy
        if (a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h) {
          if (i > j) {
            isContained = true;
            break;
          }
        } else if (
          a.x >= b.x &&
          a.y >= b.y &&
          a.x + a.w <= b.x + b.w &&
          a.y + a.h <= b.y + b.h
        ) {
          isContained = true;
          break;
        }
      }
      if (!isContained) {
        prunedFreeRects.push(newFreeRects[i]);
      }
    }
    sheet.freeRects = prunedFreeRects;
  };

  // Place each part
  flatParts.forEach((part) => {
    let placed = false;

    // Search existing sheets one by one (First-Fit)
    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      const sheet = sheets[sIdx];
      let bestScore1 = Infinity;
      let bestScore2 = Infinity;
      let bestRotated = false;
      let bestFreeRectIdx = -1;

      // Find the best free rectangle in the current sheet
      for (let rIdx = 0; rIdx < sheet.freeRects.length; rIdx++) {
        const freeRect = sheet.freeRects[rIdx];

        // Try normal
        const normalScore = scorePlacement(freeRect, part.w + kerf, part.h + kerf);
        if (
          normalScore.score1 < bestScore1 ||
          (normalScore.score1 === bestScore1 && normalScore.score2 < bestScore2)
        ) {
          bestScore1 = normalScore.score1;
          bestScore2 = normalScore.score2;
          bestFreeRectIdx = rIdx;
          bestRotated = false;
        }

        // Try rotated
        if (allowRotation) {
          const rotatedScore = scorePlacement(freeRect, part.h + kerf, part.w + kerf);
          if (
            rotatedScore.score1 < bestScore1 ||
            (rotatedScore.score1 === bestScore1 && rotatedScore.score2 < bestScore2)
          ) {
            bestScore1 = rotatedScore.score1;
            bestScore2 = rotatedScore.score2;
            bestFreeRectIdx = rIdx;
            bestRotated = true;
          }
        }
      }

      // If we found a valid placement on the current sheet, place it and stop searching other sheets!
      if (bestFreeRectIdx !== -1) {
        const freeRect = sheet.freeRects[bestFreeRectIdx];
        const pw = bestRotated ? part.h : part.w;
        const ph = bestRotated ? part.w : part.h;

        sheet.parts.push({
          id: part.id,
          name: part.name,
          x: margin + freeRect.x,
          y: margin + freeRect.y,
          width: pw,
          height: ph,
          rotated: bestRotated,
        });

        const placedRect = { x: freeRect.x, y: freeRect.y, w: pw + kerf, h: ph + kerf };
        updateFreeRects(sheet, placedRect);
        placed = true;
        break; // First-Fit: stop searching subsequent sheets
      }
    }

    // If still not placed, try to fit it on a new sheet
    if (!placed) {
      const newSheet = createNewSheet(sheets.length + 1);
      const freeRect = newSheet.freeRects[0];
      const normalScore = scorePlacement(freeRect, part.w + kerf, part.h + kerf);
      let fitRotated = false;
      let fitScore1 = normalScore.score1;
      let fitScore2 = normalScore.score2;

      if (allowRotation) {
        const rotatedScore = scorePlacement(freeRect, part.h + kerf, part.w + kerf);
        if (
          rotatedScore.score1 < fitScore1 ||
          (rotatedScore.score1 === fitScore1 && rotatedScore.score2 < fitScore2)
        ) {
          fitScore1 = rotatedScore.score1;
          fitScore2 = rotatedScore.score2;
          fitRotated = true;
        }
      }

      if (fitScore1 !== Infinity) {
        const pw = fitRotated ? part.h : part.w;
        const ph = fitRotated ? part.w : part.h;

        newSheet.parts.push({
          id: part.id,
          name: part.name,
          x: margin + freeRect.x,
          y: margin + freeRect.y,
          width: pw,
          height: ph,
          rotated: fitRotated,
        });

        const placedRect = { x: freeRect.x, y: freeRect.y, w: pw + kerf, h: ph + kerf };
        updateFreeRects(newSheet, placedRect);
        sheets.push(newSheet); // Only add to sheets if the part successfully fits!
      } else {
        console.error(`Part ${part.name} (${part.w}x${part.h}) is too large for sheet size ${sheetWidth}x${sheetHeight}`);
      }
    }
  });

  // Calculate efficiency metrics, filter out empty sheets (safeguard), and convert to NestedSheet[]
  return sheets
    .filter((s) => s.parts.length > 0)
    .map((s, idx) => {
      let usedArea = 0;
      s.parts.forEach((p) => {
        usedArea += p.width * p.height;
      });
      const totalArea = s.width * s.height;
      return {
        sheetId: idx + 1, // Sequentially index sheet IDs
        width: s.width,
        height: s.height,
        parts: s.parts,
        usedArea,
        wasteArea: totalArea - usedArea,
        efficiency: parseFloat(((usedArea / totalArea) * 100).toFixed(1)),
      };
    });
};

import type { Part } from '../data/mockData';
import type { NestedSheet } from './nesting';

/**
 * Generates an SVG string representation of a nested cutting sheet.
 * Can be downloaded and sent directly to SVG-compatible laser or CNC cutting software.
 */
export const generateSheetSVG = (sheet: NestedSheet): string => {
  const { width, height, parts } = sheet;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">\n`;
  
  // Styles
  svgContent += `  <style>
    .sheet-bg { fill: #f8f6f0; stroke: #333333; stroke-width: 5; }
    .panel-part { fill: #ebd3ba; stroke: #b45309; stroke-width: 2; rx: 4px; ry: 4px; }
    .panel-part:hover { fill: #d97706; cursor: pointer; }
    .text-label { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 500; fill: #451a03; }
    .text-dim { font-family: 'Inter', sans-serif; font-size: 18px; fill: #6b3e21; }
  </style>\n`;

  // Draw board background
  svgContent += `  <rect class="sheet-bg" x="0" y="0" width="${width}" height="${height}" />\n`;

  // Draw panels/parts
  parts.forEach((part) => {
    svgContent += `  <g id="svg-part-${part.id}">\n`;
    svgContent += `    <rect class="panel-part" x="${part.x}" y="${part.y}" width="${part.width}" height="${part.height}" />\n`;
    
    // Label inside the panel
    if (part.width > 120 && part.height > 60) {
      // Clean name
      const cleanName = part.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      svgContent += `    <text class="text-label" x="${part.x + 15}" y="${part.y + 35}">${cleanName}</text>\n`;
      svgContent += `    <text class="text-dim" x="${part.x + 15}" y="${part.y + 60}">${part.width} x ${part.height} мм</text>\n`;
    }
    svgContent += `  </g>\n`;
  });

  svgContent += `</svg>`;
  return svgContent;
};

/**
 * Generates a standard ASCII DXF format string containing 2D panel geometries.
 * DXF is the industrial standard file format imported by CNC and CAD software.
 */
export const generatePartsDXF = (parts: Part[]): string => {
  let dxf = '';

  // 1. DXF Header
  dxf += '  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1009\n  0\nENDSEC\n';

  // 2. DXF Tables (Layers)
  dxf += '  0\nSECTION\n  2\nTABLES\n  0\nTABLE\n  2\nLTYPE\n 70\n1\n  0\nLTYPE\n  2\nCONTINUOUS\n 70\n0\n  3\nSolid line\n 72\n65\n 73\n0\n 40\n0.0\n  0\nENDTAB\n';
  dxf += '  0\nTABLE\n  2\nLAYER\n 70\n2\n  0\nLAYER\n  2\nTAVMAX_CUT\n 70\n0\n 62\n1\n  6\nCONTINUOUS\n  0\nLAYER\n  2\nTAVMAX_LABEL\n 70\n0\n 62\n7\n  6\nCONTINUOUS\n  0\nENDTAB\n  0\nENDSEC\n';

  // 3. DXF Blocks
  dxf += '  0\nSECTION\n  2\nBLOCKS\n  0\nENDSEC\n';

  // 4. DXF Entities (The drawing elements)
  dxf += '  0\nSECTION\n  2\nENTITIES\n';

  let currentX = 0;
  parts.forEach((part, idx) => {
    // Generate simple spaced layouts of parts in DXF space for easy visualization
    const pW = part.width;
    const pH = part.height;
    
    // Draw part outline as 4 lines in the "TAVMAX_CUT" layer
    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      let l = '';
      l += '  0\nLINE\n';
      l += '  8\nTAVMAX_CUT\n'; // Layer
      l += ` 10\n${x1}\n`;   // Start X
      l += ` 20\n${y1}\n`;   // Start Y
      l += ` 30\n0.0\n`;     // Start Z
      l += ` 11\n${x2}\n`;   // End X
      l += ` 21\n${y2}\n`;   // End Y
      l += ` 31\n0.0\n`;     // End Z
      return l;
    };

    // Draw lines for the rectangle
    dxf += drawLine(currentX, 0, currentX + pW, 0);
    dxf += drawLine(currentX + pW, 0, currentX + pW, pH);
    dxf += drawLine(currentX + pW, pH, currentX, pH);
    dxf += drawLine(currentX, pH, currentX, 0);

    // Draw Part Name as text entity in the "TAVMAX_LABEL" layer
    dxf += '  0\nTEXT\n';
    dxf += '  8\nTAVMAX_LABEL\n';
    dxf += ` 10\n${currentX + 10}\n`; // X coordinate of text
    dxf += ` 20\n${pH / 2}\n`;         // Y coordinate of text
    dxf += ' 40\n15.0\n';               // Height of text (15mm)
    dxf += `  1\n${part.name} [${idx + 1}]\n`; // Text value
    dxf += ' 50\n0.0\n';                // Rotation angle

    // Spacing to the next part in DXF coordinate space
    currentX += pW + 50; 
  });

  // 5. DXF End
  dxf += '  0\nENDSEC\n  0\nEOF\n';

  return dxf;
};

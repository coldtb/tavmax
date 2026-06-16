import { jsPDF } from 'jspdf';
import type { Project, Material } from '../data/mockData';
import { DEFAULT_MATERIALS } from '../data/mockData';
import type { NestedSheet } from './nesting';

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export interface PDFExportCosts {
  board: number;
  edge: number;
  hardware: number;
  labor: number;
  profit: number;
  vat?: number;
  total: number;
}

export const exportProjectToPDF = async (
  project: Project,
  materials: Material[],
  sheets: NestedSheet[],
  threeImageDataUrl?: string | null,
  costs?: PDFExportCosts
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let fontName = 'helvetica';

  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('/Roboto-Regular.ttf'),
      fetch('/Roboto-Bold.ttf')
    ]);

    if (regRes.ok && boldRes.ok) {
      const [regBuf, boldBuf] = await Promise.all([
        regRes.arrayBuffer(),
        boldRes.arrayBuffer()
      ]);

      const regBase64 = arrayBufferToBase64(regBuf);
      const boldBase64 = arrayBufferToBase64(boldBuf);

      doc.addFileToVFS('Roboto-Regular.ttf', regBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

      doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

      fontName = 'Roboto';
    }
  } catch (e) {
    console.error('Error loading custom Cyrillic fonts:', e);
  }

  const primaryMaterial = materials.find((m) => m.id === project.config.materialId) || materials[0];
  const doorMaterial = project.config.doorStyle === 'classic'
    ? (materials.find((m) => m.id === 'mat-9') || materials[0])
    : (materials.find((m) => m.id === project.config.doorMaterialId) || materials[0]);

  // Helper: Draw Premium Border
  const drawPageBorder = () => {
    doc.setDrawColor(217, 119, 6); // Amber border accent
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287);
    
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.1);
    doc.rect(7, 7, 196, 283);
  };

  // Helper: Header & Footer
  const addHeaderFooter = (pageNum: number, totalPages: number) => {
    drawPageBorder();
    // Header
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('TAVMAX — FURNITURE DESIGN & MANUFACTURING', 10, 12);
    doc.setLineWidth(0.1);
    doc.line(10, 14, 200, 14);

    // Footer
    doc.line(10, 282, 200, 282);
    doc.text(`Хуудас ${pageNum} / ${totalPages}`, 180, 286);
    doc.text('tavmax.mn - Ухаалаг тавилгын систем', 10, 286);
  };

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  drawPageBorder();
  
  // Decorative geometric element
  doc.setFillColor(15, 17, 23);
  doc.rect(7, 7, 196, 70, 'F');
  
  // Title
  doc.setFont(fontName, 'bold');
  doc.setFontSize(28);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text('TAVMAX', 20, 35);
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('ҮЙЛДВЭРЛЭЛИЙН ТӨСЛИЙН ТАЙЛАН', 20, 48);

  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text('Ухаалаг Зүсэлт, 3D Загварчлалын Нэгдсэн Систем', 20, 56);

  // Metadata block
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  
  let y = 110;
  doc.text('Төслийн нэр:', 20, y);
  doc.setFont(fontName, 'normal');
  doc.text(project.name, 70, y);
  
  y += 10;
  doc.setFont(fontName, 'bold');
  doc.text('Тавилгын төрөл:', 20, y);
  doc.setFont(fontName, 'normal');
  const typeMap: Record<string, string> = {
    custom: 'Хэрэглэгчийн загвар (Custom)',
    wardrobe: 'Шкаф / Хувцасны шүүгээ',
    kitchen_lower: 'Гал тогооны доод шүүгээ',
    kitchen_upper: 'Гал тогооны дээд шүүгээ',
    bookshelf: 'Номын тавиур',
    tv_unit: 'ТВ-ний тавиур',
    cabinet: 'Аяга тавагны шүүгээ',
    office_desk: 'Бичгийн ширээ',
    bed: 'Ор',
    vanity: 'Нүүр будалтын ширээ'
  };
  doc.text(typeMap[project.furnitureType] || project.furnitureType, 70, y);

  y += 10;
  doc.setFont(fontName, 'bold');
  doc.text('Огноо:', 20, y);
  doc.setFont(fontName, 'normal');
  doc.text(new Date(project.updatedAt).toLocaleDateString('mn-MN'), 70, y);

  y += 10;
  doc.setFont(fontName, 'bold');
  doc.text('Захиалагч:', 20, y);
  doc.setFont(fontName, 'normal');
  doc.text(`${project.customerName} (${project.customerPhone})`, 70, y);

  y += 20;
  doc.setFont(fontName, 'bold');
  doc.text('Тавилгын Хэмжээс:', 20, y);
  doc.setFont(fontName, 'normal');
  doc.text(`Өргөн: ${project.config.width}мм | Өндөр: ${project.config.height}мм | Гүн: ${project.config.depth}мм`, 70, y);

  y += 10;
  doc.setFont(fontName, 'bold');
  doc.text('Үндсэн материал:', 20, y);
  doc.setFont(fontName, 'normal');
  doc.text(`${primaryMaterial.name} (${primaryMaterial.code}) - ${primaryMaterial.thickness}мм`, 70, y);

  y += 10;
  doc.setFont(fontName, 'bold');
  doc.text('Хаалганы материал:', 20, y);
  doc.setFont(fontName, 'normal');
  doc.text(`${doorMaterial.name} (${doorMaterial.code}) - ${doorMaterial.thickness}мм`, 70, y);

  // 3D image block - pushed down to prevent overlap with text
  const imgY = 185;
  const imgH = 48;
  const imgW = 140;
  const imgX = 35;

  if (threeImageDataUrl) {
    try {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.25);
      doc.rect(imgX, imgY, imgW, imgH);
      doc.addImage(threeImageDataUrl, 'PNG', imgX + 1, imgY + 1, imgW - 2, imgH - 2);
    } catch (e) {
      console.error('Error adding image to PDF:', e);
    }
  } else {
    // Fallback decorative / placeholder
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.rect(imgX, imgY, imgW, imgH);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('3D Загварын зураг', 105, imgY + imgH / 2 + 2, { align: 'center' });
  }

  // Signatures - pushed down to prevent overlap
  doc.setFontSize(10);
  doc.setFont(fontName, 'bold');
  doc.text('Тайлан бэлтгэсэн:', 20, 245);
  doc.setFont(fontName, 'normal');
  doc.text('TavMax Дизайнер програм', 20, 251);

  doc.setFont(fontName, 'bold');
  doc.text('Зөвшөөрсөн (Захиалагч):', 120, 245);
  doc.line(120, 260, 190, 260);

  // ==========================================
  // PAGE 2: PARTS LIST
  // ==========================================
  doc.addPage();
  addHeaderFooter(2, 3 + Math.ceil(sheets.length / 2));

  doc.setFont(fontName, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(217, 119, 6);
  doc.text('БЭЛДЭЦИЙН ЖАГСААЛТ (PARTS LIST)', 10, 24);

  // Draw table header
  doc.setFillColor(15, 17, 23);
  doc.rect(10, 30, 190, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Нэр', 12, 35);
  doc.text('Өндөр (мм)', 65, 35);
  doc.text('Өргөн (мм)', 90, 35);
  doc.text('Тоо', 115, 35);
  doc.text('Материал', 128, 35);
  doc.text('Ирмэг хуулга', 170, 35);

  let py = 38;
  doc.setTextColor(40, 40, 40);
  project.parts.forEach((part, index) => {
    if (py > 260) {
      // Create new page for remaining parts
      doc.addPage();
      addHeaderFooter(3, 4); // basic adjustment
      doc.setFillColor(15, 17, 23);
      doc.rect(10, 30, 190, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('Нэр', 12, 35);
      doc.text('Өндөр (мм)', 65, 35);
      doc.text('Өргөн (мм)', 90, 35);
      doc.text('Тоо', 115, 35);
      doc.text('Материал', 128, 35);
      doc.text('Ирмэг хуулга', 170, 35);
      py = 38;
    }
    
    // Zebra striping
    if (index % 2 === 1) {
      doc.setFillColor(245, 245, 245);
      doc.rect(10, py - 4, 190, 6.5, 'F');
    }

    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);

    // Truncate name if too long
    const partName = part.name.length > 25 ? part.name.substring(0, 23) + '..' : part.name;
    doc.text(partName, 12, py);
    doc.text(part.height.toString(), 65, py);
    doc.text(part.width.toString(), 90, py);
    doc.text(part.quantity.toString(), 115, py);
    
    const mat = materials.find((m) => m.id === part.materialId);
    doc.text(mat ? mat.name.substring(0, 18) : 'Материалгүй', 128, py);
    doc.text(part.edgeBanding === 'none' ? 'Ирмэггүй' : part.edgeBanding, 170, py);

    py += 6.5;
  });

  // ==========================================
  // PAGE 3: PRICING & HARDWARE
  // ==========================================
  doc.addPage();
  const pricingPageNum = doc.getNumberOfPages();
  addHeaderFooter(pricingPageNum, pricingPageNum + Math.ceil(sheets.length / 2));

  doc.setFont(fontName, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(217, 119, 6);
  doc.text('ТӨСЛИЙН ЗАРДАЛ, ҮНИЙН ТООЦООЛУУР', 10, 24);

  // If costs are not provided, calculate them exactly to avoid guessing
  let boardCost = 0;
  let edgeCost = 0;
  let hardwareCost = 0;
  let laborCost = 0;
  let profitCost = 0;
  let totalCost = 0;

  if (costs) {
    boardCost = costs.board;
    edgeCost = costs.edge;
    hardwareCost = costs.hardware;
    laborCost = costs.labor || 0;
    profitCost = costs.profit || 0;
    totalCost = costs.total;
  } else {
    // 1. Board cost calculation with fallbacks
    const partsByMaterial: { [matId: string]: number } = {};
    project.parts.forEach((p) => {
      partsByMaterial[p.materialId] = (partsByMaterial[p.materialId] || 0) + (p.width * p.height * p.quantity);
    });

    if (sheets.length > 0) {
      sheets.forEach((sheet) => {
        const mat = materials.find((m) => m.id === (sheet as any).materialId) || materials[0];
        const defaultMat = DEFAULT_MATERIALS.find((dm) => dm.id === (sheet as any).materialId) || DEFAULT_MATERIALS[0];
        const matPrice = mat && mat.price > 1000 ? mat.price : defaultMat.price;
        boardCost += matPrice;
      });
    } else if (project.parts.length > 0) {
      // Fallback: estimate sheet count based on total area
      const sheetW = 2440;
      const sheetH = 1220;

      Object.entries(partsByMaterial).forEach(([matId, partsArea]) => {
        const mat = materials.find((m) => m.id === matId) || materials[0];
        const defaultMat = DEFAULT_MATERIALS.find((dm) => dm.id === matId) || DEFAULT_MATERIALS[0];
        const matPrice = mat && mat.price > 1000 ? mat.price : defaultMat.price;

        const isCountertopMat = matId === 'mat-ct-wood' || matId === 'mat-ct-stone';
        const nestSheetW = isCountertopMat ? 4600 : sheetW;
        const nestSheetH = isCountertopMat ? 600 : sheetH;
        const currentSheetArea = nestSheetW * nestSheetH;

        const sheetCount = Math.max(1, Math.ceil((partsArea * 1.25) / currentSheetArea));
        boardCost += sheetCount * matPrice;
      });
    }

    // 2. Edge banding cost
    project.parts.forEach((p) => {
      if (p.edgeBanding && p.edgeBanding !== 'none') {
        const perimeter = (p.width + p.height) * 2;
        const rate = p.edgeBanding === '2mm' ? 1.5 : 0.8;
        edgeCost += perimeter * rate * p.quantity;
      }
    });

    // 3. Hardware cost
    const hingesCount = (project.config.doors || 0) * 3;
    const tracksCount = project.config.drawers || 0;
    hardwareCost = hingesCount * 8000 + tracksCount * 25000 + 40000;

    totalCost = boardCost + edgeCost + hardwareCost;
  }

  let cy = 35;
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  const drawCostRow = (label: string, value: number, isTotal = false) => {
    if (isTotal) {
      doc.line(10, cy - 2, 200, cy - 2);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(60, 60, 60);
    }
    doc.text(label, 15, cy);
    doc.text(`${Math.round(value).toLocaleString('mn-MN')} MNT`, 140, cy);
    cy += 10;
  };

  drawCostRow('Үндсэн болон туслах хавтангийн зардал', boardCost);
  drawCostRow('Ирмэг хуулга болон наалтын зардал', edgeCost);
  drawCostRow('Тоноглол, нугас, шургуулганы чиглүүлэгч', hardwareCost);
  
  if (laborCost > 0) {
    drawCostRow('Ажлын хөлс, зүсэлт, угсралт', laborCost);
  }

  const otherCost = totalCost - (boardCost + edgeCost + hardwareCost + laborCost + profitCost);
  if (otherCost > 1) {
    drawCostRow('Хүргэлт, суурилуулалтын зардал', otherCost);
  }

  if (profitCost > 0) {
    drawCostRow('Цэвэр ашиг', profitCost);
  }

  drawCostRow('НИЙТ САНАЛ БОЛГОЖ БУЙ ҮНЭ', totalCost, true);

  // Notes area
  cy += 15;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('Үйлдвэрлэлийн Тэмдэглэл:', 15, cy);
  cy += 6;
  doc.setFont(fontName, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('1. Бүх бэлдэцийг CNC зүсэлтийн машинд шууд оруулах боломжтой SVG болон DXF өгөгдлөөр экспортлосон.', 15, cy);
  cy += 5;
  doc.text('2. Ирмэг хуулгыг тэмдэглэгээний дагуу 2мм болон 1мм өргөнтэйгээр наах шаардлагатай.', 15, cy);
  cy += 5;
  doc.text('3. Захиалга үйлдвэрлэлд орсны дараа хэмжээ болон материалын өөрчлөлт оруулах боломжгүйг анхаарна уу.', 15, cy);

  // ==========================================
  // PAGE 4+: NESTING LAYOUT DRAWINGS
  // ==========================================
  // Draw nesting sheets. Two sheets per page.
  for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
    if (sIdx % 2 === 0) {
      doc.addPage();
      const currentNestingPage = doc.getNumberOfPages();
      addHeaderFooter(currentNestingPage, currentNestingPage); // page numbers update dynamically
      
      doc.setFont(fontName, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(217, 119, 6);
      doc.text('ЗҮСЭЛТИЙН ХАВТАНГИЙН БАЙРШИЛ (NESTING)', 10, 24);
    }

    const sheet = sheets[sIdx];
    const pageOffset = (sIdx % 2 === 0) ? 35 : 155;

    // Draw sheet title
    doc.setFont(fontName, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(`Хавтан №${sheet.sheetId}: ${sheet.width}x${sheet.height}мм | Ашиглалт: ${sheet.efficiency}%`, 15, pageOffset);

    // Draw the sheet bounding box
    // A4 width: 210mm. Sheet margins: 10mm left/right. Usable width: 190mm.
    // Scale sheet. 2750 width scaled to 170mm.
    const scale = 170 / sheet.width;
    const drawX = 20;
    const drawY = pageOffset + 5;
    const drawW = sheet.width * scale;
    const drawH = sheet.height * scale;

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.setFillColor(248, 247, 245);
    doc.rect(drawX, drawY, drawW, drawH, 'FD');

    // Draw parts inside the sheet
    doc.setDrawColor(217, 119, 6); // amber outline for parts
    doc.setLineWidth(0.15);
    
    sheet.parts.forEach((part) => {
      const px = drawX + part.x * scale;
      const py = drawY + part.y * scale;
      const pw = part.width * scale;
      const ph = part.height * scale;

      doc.setFillColor(235, 213, 186); // Light amber fills for packed parts
      doc.rect(px, py, pw, ph, 'FD');

      // Label inside the box - show both name and size for clarity
      if (pw > 12 && ph > 5) {
        doc.setFontSize(4.5);
        doc.setFont(fontName, 'normal');
        doc.setTextColor(60, 40, 20);

        // Center X and Y coordinates inside the part rect
        const cx = px + pw / 2;
        const cy = py + ph / 2;

        // Clean name (e.g. remove module prefixes or trim spaces)
        let displayName = part.name;
        if (displayName.includes(' - ')) {
          displayName = displayName.split(' - ')[1];
        }

        // Limit character length based on box width
        const maxChars = Math.max(3, Math.floor(pw / 0.85));
        if (displayName.length > maxChars) {
          displayName = displayName.substring(0, Math.max(3, maxChars - 2)) + '..';
        }

        const sizeLabel = `${part.width}x${part.height}`;

        if (ph > 8) {
          // Print two lines: Name on top, dimensions below
          doc.text(displayName, cx, cy - 0.8, { align: 'center' });
          doc.text(sizeLabel, cx, cy + 1.8, { align: 'center' });
        } else {
          // Print one line: Name (or name + dimensions if space allows)
          const combined = `${displayName} (${sizeLabel})`;
          const maxCombinedChars = Math.max(3, Math.floor(pw / 0.75));
          if (combined.length <= maxCombinedChars) {
            doc.text(combined, cx, cy + 0.8, { align: 'center' });
          } else {
            doc.text(displayName, cx, cy + 0.8, { align: 'center' });
          }
        }
      }
    });
  }

  // Save the document
  doc.save(`TavMax_Project_${project.name}.pdf`);
};

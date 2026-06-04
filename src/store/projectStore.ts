import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, FurnitureConfig, Part, CabinetModule } from '../data/mockData';
import { DEFAULT_MATERIALS, INITIAL_PROJECTS } from '../data/mockData';

export interface CabinetTemplate {
  id: string;
  name: string;
  type: CabinetModule['type'];
  config: FurnitureConfig;
}

// Full layout snapshot — saves ALL modules with their positions
export interface LayoutTemplate {
  id: string;
  name: string;
  savedAt: string;
  modules: CabinetModule[];
  moduleCount: number;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  selectedModuleId: string | null;
  materials: typeof DEFAULT_MATERIALS;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (project: Project | null) => void;
  setSelectedModuleId: (id: string | null) => void;
  updateActiveConfig: (config: Partial<FurnitureConfig>) => void;
  updateActiveParts: (parts: Part[]) => void;
  updateProjectStatus: (id: string, status: Project['status']) => void;
  addPartToActive: (part: Omit<Part, 'id'>) => void;
  removePartFromActive: (partId: string) => void;
  updatePartInActive: (partId: string, updated: Partial<Part>) => void;
  generatePartsForActive: () => void;
  changeActiveFurnitureType: (type: Project['furnitureType'], newConfig: FurnitureConfig) => void;
  
  // Multi-module layout operations
  addModuleToActive: (type: CabinetModule['type'], config: FurnitureConfig, name?: string) => void;
  removeModuleFromActive: (moduleId: string) => void;
  updateModulePosition: (moduleId: string, x: number, y: number, z: number) => void;
  updateModuleRotation: (moduleId: string, rotationDeg: number) => void;
  duplicateModule: (moduleId: string) => void;
  resetModulePositions: () => void;
  alignModulesSideBySide: () => void;
  updateMaterialPrice: (materialId: string, price: number) => void;

  // Custom single-module templates
  customTemplates: CabinetTemplate[];
  addCustomTemplate: (name: string, type: CabinetModule['type'], config: FurnitureConfig) => void;
  deleteCustomTemplate: (id: string) => void;

  // Full layout save/load
  savedLayouts: LayoutTemplate[];
  saveLayout: (name: string) => void;
  deleteLayout: (id: string) => void;
  loadLayout: (id: string) => void;

  // Clear all
  clearAllModules: () => void;
}

export interface CabinetSection {
  width: number;
  centerX: number; // relative to module center
}

export const getCabinetSections = (width: number, config: FurnitureConfig, type?: string): CabinetSection[] => {
  const insideWidth = width - 36;
  const doors = Number(config.doors) || 0;
  const drawers = Number(config.drawers) || 0;
  
  const partitions = config.partitions !== undefined 
    ? Number(config.partitions) 
    : (type === 'wardrobe' 
        ? (doors > 1 ? doors - 1 : 0) 
        : (type === 'bookshelf' 
            ? 0 
            : (doors > 0 ? (drawers > 0 ? doors : doors - 1) : 0)
          )
      );

  const halfW = width / 2;

  // Initialize or retrieve divider positions (measured from left outer edge)
  let dPositions = config.dividerPositions || [];
  if (dPositions.length !== partitions) {
    dPositions = [];
    for (let i = 0; i < partitions; i++) {
      dPositions.push(Math.round((i + 1) * width / (partitions + 1)));
    }
  }

  const sections: CabinetSection[] = [];
  if (partitions === 0) {
    sections.push({
      width: insideWidth,
      centerX: 0
    });
  } else {
    // First section
    const w0 = dPositions[0] - 27;
    sections.push({
      width: w0,
      centerX: -halfW + 18 + w0 / 2
    });
    // Middle sections
    for (let i = 1; i < partitions; i++) {
      const w = dPositions[i] - dPositions[i-1] - 18;
      sections.push({
        width: w,
        centerX: -halfW + (dPositions[i-1] + dPositions[i]) / 2
      });
    }
    // Last section
    const lastW = width - dPositions[partitions - 1] - 27;
    sections.push({
      width: lastW,
      centerX: -halfW + dPositions[partitions - 1] + 9 + lastW / 2
    });
  }
  return sections;
};

export interface FrontPanel {
  width: number;
  centerX: number;
}

export const getCabinetFrontPanels = (width: number, config: FurnitureConfig): FrontPanel[] => {
  const halfW = width / 2;
  const doors = Number(config.doors) || 0;
  const drawers = Number(config.drawers) || 0;
  
  const partitions = config.partitions !== undefined 
    ? Number(config.partitions) 
    : (doors > 0 ? (drawers > 0 ? doors : doors - 1) : 0);

  // Initialize or retrieve divider positions (measured from left outer edge)
  let dPositions = config.dividerPositions || [];
  if (dPositions.length !== partitions) {
    dPositions = [];
    for (let i = 0; i < partitions; i++) {
      dPositions.push(Math.round((i + 1) * width / (partitions + 1)));
    }
  }

  const boundaries: number[] = [];
  boundaries.push(-halfW + 9); // Left side panel center
  for (let i = 0; i < partitions; i++) {
    boundaries.push(-halfW + dPositions[i]); // Divider center
  }
  boundaries.push(halfW - 9); // Right side panel center

  const numSections = partitions + 1;
  const panels: FrontPanel[] = [];

  for (let j = 0; j < numSections; j++) {
    const leftBound = boundaries[j];
    const rightBound = boundaries[j+1];

    const xLeft = j === 0 ? -halfW + 3 : leftBound + 2;
    const xRight = j === numSections - 1 ? halfW - 3 : rightBound - 2;

    panels.push({
      width: xRight - xLeft,
      centerX: (xLeft + xRight) / 2
    });
  }

  return panels;
};

// Function to calculate parts dynamically based on furniture config dimensions
const calculateDynamicParts = (type: Project['furnitureType'], config: FurnitureConfig): Part[] => {
  const width = Number(config.width) || 0;
  const height = Number(config.height) || 0;
  const depth = Number(config.depth) || 0;
  const shelves = Number(config.shelves) || 0;
  const drawers = Number(config.drawers) || 0;
  const doors = Number(config.doors) || 0;
  const { materialId } = config;
  let doorMaterialId = config.doorMaterialId;
  if (config.doorStyle === 'classic') {
    doorMaterialId = 'mat-9';
  }
  const parts: Part[] = [];
  const edge = '2mm';

  switch (type) {
    case 'custom': {
      const baseHeight = config.hasLegs ? height - 100 : height;
      const insideWidth = width - 36;
      const parts: Part[] = [];
      
      // Side panels
      parts.push({ id: 'p-c-1', name: 'Их биеийн хажуу хана (Зүүн)', width: depth, height: baseHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-c-2', name: 'Их биеийн хажуу хана (Баруун)', width: depth, height: baseHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      
      // Top and Bottom
      parts.push({ id: 'p-c-3', name: 'Дээд таг хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-c-4', name: 'Доод суурь хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      
      // HDF Backing
      parts.push({ id: 'p-c-back', name: 'Ар тал (ХДФ)', width: width - 6, height: baseHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      
      // Sections & Dividers
      const sections = getCabinetSections(width, config, 'custom');
      const partitions = sections.length - 1;
      const insideHeight = baseHeight - 36;
      
      for (let i = 0; i < partitions; i++) {
        parts.push({
          id: `p-c-div-${i}`,
          name: `Дотор босоо хуваалт ${i + 1}`,
          width: depth - 20,
          height: insideHeight,
          quantity: 1,
          materialId,
          edgeBanding: '1mm',
          category: 'Хуваалт'
        });
      }
      
      // Doors configuration
      const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
      const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
      const shelfW = insideWidth - 2;

      // Shelves
      if (shelves > 0) {
        if (partitions > 0) {
          sections.forEach((sec, sIdx) => {
            const qty = Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0);
            if (qty > 0) {
              parts.push({
                id: `p-c-shelf-${sIdx}`,
                name: `Дотор тавиур хавтан (Секц ${sIdx+1})`,
                width: depth - 20,
                height: sec.width - 2,
                quantity: qty,
                materialId,
                edgeBanding: '1mm',
                category: 'Дээд тавиур'
              });
            }
          });
        } else {
          parts.push({ 
            id: 'p-c-shelf', 
            name: 'Дотор тавиур хавтан', 
            width: depth - 20, 
            height: shelfW, 
            quantity: shelves, 
            materialId, 
            edgeBanding: '1mm', 
            category: 'Дээд тавиур' 
          });
        }
      }

      // Drawers
      if (drawers > 0) {
        parts.push({ id: 'p-c-drawer', name: 'Шургуулганы нүүр', width: baseHeight / drawers - 10, height: width - 10, quantity: drawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
      }

      // Doors (individual left/right doors or standard)
      if (config.customDoors !== false) {
        const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
        const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
        const customDoorHeight = config.doorHeight ? Number(config.doorHeight) : (baseHeight - 10);
        
        if (hasLeftDoor) {
          parts.push({ 
            id: 'p-c-door-left', 
            name: 'Шүүгээний хаалга (Зүүн)', 
            width: customDoorWidth, 
            height: customDoorHeight, 
            quantity: 1, 
            materialId: doorMaterialId, 
            edgeBanding: edge, 
            category: 'Хаалга' 
          });
        }

        if (hasRightDoor) {
          parts.push({ 
            id: 'p-c-door-right', 
            name: 'Шүүгээний хаалга (Баруун)', 
            width: customDoorWidth, 
            height: customDoorHeight, 
            quantity: 1, 
            materialId: doorMaterialId, 
            edgeBanding: edge, 
            category: 'Хаалга' 
          });
        }
      } else {
        if (doors > 0) {
          const doorWidth = (width - 10) / doors;
          parts.push({
            id: 'p-c-door',
            name: 'Шүүгээний хаалга',
            width: doorWidth,
            height: baseHeight - 10,
            quantity: doors,
            materialId: doorMaterialId,
            edgeBanding: edge,
            category: 'Хаалга'
          });
        }
      }

      // Countertop
      if (config.countertopType && config.countertopType !== 'none') {
        const isStone = config.countertopType === 'stone';
        const ctMatId = isStone ? 'mat-ct-stone' : 'mat-ct-wood';
        parts.push({
          id: 'p-c-countertop',
          name: isStone ? 'Чулуун тавцан (Хоосон шүүгээ)' : 'Модон тавцан (Хоосон шүүгээ)',
          width: 600,
          height: width,
          quantity: 1,
          materialId: ctMatId,
          edgeBanding: 'all-sides',
          category: 'Дээд тавиур',
          notes: isStone ? 'Чулууны цехээс бэлтгүүлнэ' : 'Талбарт зүсэж угсарна'
        });
      }

      return parts;
    }
    case 'wardrobe': {
      const legHeight = config.hasLegs ? 100 : 0;
      const bodyHeight = height - legHeight;
      const insideWidth = width - 36;
      const insideHeight = bodyHeight - 36;

      // Side Panels
      parts.push({ id: 'p-w-1', name: 'Хажуу босоо хана (Зүүн)', width: depth, height: bodyHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-w-2', name: 'Хажуу босоо хана (Баруун)', width: depth, height: bodyHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      // Top and Bottom
      parts.push({ id: 'p-w-3', name: 'Дээд таг хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-w-4', name: 'Доод суурь хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      
      // Sections & Dividers
      const sections = getCabinetSections(width, config, 'wardrobe');
      const partitions = sections.length - 1;
      for (let i = 0; i < partitions; i++) {
        parts.push({ id: `p-w-div-${i}`, name: `Дотор хуваалт ${i+1}`, width: depth - 20, height: insideHeight, quantity: 1, materialId, edgeBanding: '1mm', category: 'Хуваалт' });
      }

      // Shelves
      if (shelves > 0) {
        sections.forEach((sec, sIdx) => {
          parts.push({
            id: `p-w-shelf-${sIdx}`,
            name: `Зөөврийн тавиур хавтан (Секц ${sIdx+1})`,
            width: depth - 25,
            height: sec.width - 2,
            quantity: Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0),
            materialId,
            edgeBanding: '1mm',
            category: 'Дээд тавиур'
          });
        });
      }


      // Drawers (if any)
      const firstSec = sections[0];
      const drawerW = firstSec.width;
      if (drawers > 0) {
        parts.push({ id: 'p-w-dr-f', name: 'Шургуулганы нүүр хавтан', width: 220, height: drawerW - 10, quantity: drawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
        parts.push({ id: 'p-w-dr-s', name: 'Шургуулга хайрцаг хажуу', width: 150, height: depth - 100, quantity: drawers * 2, materialId: 'mat-6', edgeBanding: '1mm', category: 'Шургуулга' });
      }

      // Doors
      if (doors > 0) {
        const doorWidth = (width - 10) / doors;
        parts.push({ id: 'p-w-door', name: 'Шкафны нугастай хаалга', width: doorWidth, height: bodyHeight - 50, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
      }

      // Backing HDF
      parts.push({ id: 'p-w-back', name: 'Ар тал (ХДФ)', width: width - 6, height: bodyHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      break;
    }
    case 'bookshelf': {
      const legHeight = config.hasLegs ? 100 : 0;
      const bodyHeight = height - legHeight;
      const insideWidth = width - 36;
      const insideHeight = bodyHeight - 36;

      // Side Panels
      parts.push({ id: 'p-b-1', name: 'Хажуу босоо хана (Зүүн)', width: depth, height: bodyHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-b-2', name: 'Хажуу босоо хана (Баруун)', width: depth, height: bodyHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      // Top and Bottom
      parts.push({ id: 'p-b-3', name: 'Дээд таг хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-b-4', name: 'Доод суурь хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      
      // Sections & Dividers
      const sections = getCabinetSections(width, config, 'bookshelf');
      const partitions = sections.length - 1;
      for (let i = 0; i < partitions; i++) {
        parts.push({ id: `p-b-div-${i}`, name: `Дотор хуваалт ${i+1}`, width: depth - 10, height: insideHeight, quantity: 1, materialId, edgeBanding: '1mm', category: 'Хуваалт' });
      }

      // Shelves
      if (shelves > 0) {
        sections.forEach((sec, sIdx) => {
          parts.push({
            id: `p-b-shelf-${sIdx}`,
            name: `Тавиур хавтан (Секц ${sIdx+1})`,
            width: depth - 10,
            height: sec.width - 2,
            quantity: Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0),
            materialId,
            edgeBanding: '1mm',
            category: 'Дээд тавиур'
          });
        });
      }

      // Doors
      if (doors > 0) {
        const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
        const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
        const customDoorHeight = config.doorHeight ? Number(config.doorHeight) : (bodyHeight - 10);
        if (config.customDoors) {
          const leftDoorVal = config.leftDoor !== undefined ? config.leftDoor : (doors === 1 || doors >= 2 ? 1 : 0);
          const rightDoorVal = config.rightDoor !== undefined ? config.rightDoor : (doors >= 2 ? 1 : 0);
          const leftDoorCount = typeof leftDoorVal === 'number' ? leftDoorVal : (leftDoorVal ? 1 : 0);
          const rightDoorCount = typeof rightDoorVal === 'number' ? rightDoorVal : (rightDoorVal ? 1 : 0);
          if (leftDoorCount > 0) {
            parts.push({ id: 'p-b-door-left', name: 'Номын шкафны хаалга (Зүүн)', width: customDoorWidth, height: customDoorHeight, quantity: leftDoorCount, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
          }
          if (rightDoorCount > 0) {
            parts.push({ id: 'p-b-door-right', name: 'Номын шкафны хаалга (Баруун)', width: customDoorWidth, height: customDoorHeight, quantity: rightDoorCount, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
          }
        } else {
          const doorWidth = (width - 10) / doors;
          parts.push({ id: 'p-b-door', name: 'Номын шкафны хаалга', width: doorWidth, height: bodyHeight - 10, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      }

      // Backing HDF
      parts.push({ id: 'p-b-back', name: 'Ар тал (ХДФ)', width: width - 6, height: bodyHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      break;
    }

    case 'kitchen_lower': {
      // standard kitchen base height: 750 (excluding legs)
      const baseHeight = config.hasLegs ? height - 100 : height;
      parts.push({ id: 'p-kl-1', name: 'Гал тогооны хажуу хана', width: depth, height: baseHeight, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-kl-2', name: 'Доод суурь хавтан', width: depth, height: width - 36, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      parts.push({ id: 'p-kl-3', name: 'Дээд холбоос хавтан', width: 100, height: width - 36, quantity: 2, materialId, edgeBanding: 'none', category: 'Дээд тавиур' });
      
      const sections = getCabinetSections(width, config, 'kitchen_lower');
      const panels = getCabinetFrontPanels(width, config);

      if (sections.length > 1) {
        const numSections = sections.length;

        for (let j = 0; j < numSections; j++) {
          const sec = sections[j];
          const panel = panels[j];

          let secDrawers = 0;
          let secDoors = 0;

          // Distribute drawers and doors across all sections
          if (drawers > 0) {
            secDrawers = Math.floor(drawers / numSections) + (j < drawers % numSections ? 1 : 0);
          }
          if (doors > 0) {
            secDoors = Math.floor(doors / numSections) + (j < doors % numSections ? 1 : 0);
          }

          const sectionH = baseHeight - 10;
          const hasDrawersAndDoors = secDrawers > 0 && secDoors > 0;
          const drawerAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;
          const doorAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;

          if (secDrawers > 0) {
            // Drawers section (placed at the top if both drawers and doors exist)
            parts.push({
              id: `p-kl-dr-f-${j}`,
              name: `Шургуулганы нүүр`,
              width: Math.round(drawerAreaH / secDrawers - 5),
              height: panel.width,
              quantity: secDrawers,
              materialId: doorMaterialId,
              edgeBanding: edge,
              category: 'Шургуулга'
            });
            parts.push({
              id: `p-kl-dr-s-${j}`,
              name: `Шургуулганы хажуу бэлдэц`,
              width: 120,
              height: depth - 50,
              quantity: secDrawers * 2,
              materialId: 'mat-6',
              edgeBanding: '1mm',
              category: 'Шургуулга'
            });
          }
          
          if (secDoors > 0) {
            // Door section (placed at the bottom if both drawers and doors exist)
            const doorWidth = (panel.width - 4 * (secDoors - 1)) / secDoors;
            parts.push({
              id: `p-kl-door-${j}`,
              name: `Шүүгээний хаалга`,
              width: doorWidth,
              height: Math.round(doorAreaH),
              quantity: secDoors,
              materialId: doorMaterialId,
              edgeBanding: edge,
              category: 'Хаалга'
            });
          }
        }
      } else {
        if (config.customDoors) {
          const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
          const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
          const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
          const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;

          if (doors > 0 && drawers === 0) {
            const doorH = config.doorHeight ? Number(config.doorHeight) : (baseHeight - 10);
            if (hasLeftDoor) {
              parts.push({ id: 'p-kl-door-left', name: 'Шүүгээний хаалга (Зүүн)', width: customDoorWidth, height: doorH, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
            }
            if (hasRightDoor) {
              parts.push({ id: 'p-kl-door-right', name: 'Шүүгээний хаалга (Баруун)', width: customDoorWidth, height: doorH, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
            }
          } else if (drawers > 0 && doors === 0) {
            const drWidth = (width - 10);
            parts.push({ id: 'p-kl-dr-f', name: 'Шургуулганы нүүр', width: baseHeight / drawers - 10, height: drWidth, quantity: drawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
          } else if (drawers > 0 && doors > 0) {
            const singleDrawerH = 150;
            const doorH = config.doorHeight ? Number(config.doorHeight) : (baseHeight - drawers * singleDrawerH - 10);
            if (hasLeftDoor) {
              parts.push({ id: 'p-kl-door-left', name: 'Шүүгээний хаалга (Зүүн)', width: customDoorWidth, height: doorH, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
            }
            if (hasRightDoor) {
              parts.push({ id: 'p-kl-door-right', name: 'Шүүгээний хаалга (Баруун)', width: customDoorWidth, height: doorH, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
            }
            const drWidth = (width - 10);
            parts.push({ id: 'p-kl-dr-f', name: 'Шургуулганы нүүр', width: singleDrawerH - 10, height: drWidth, quantity: drawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
          }
        } else {
          if (doors > 0 && drawers === 0) {
            const doorWidth = (width - 10) / doors;
            parts.push({ id: 'p-kl-door', name: 'Шүүгээний хаалга', width: doorWidth, height: baseHeight - 10, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
          } else if (drawers > 0 && doors === 0) {
            const drWidth = (width - 10);
            parts.push({ id: 'p-kl-dr-f', name: 'Шургуулганы нүүр', width: baseHeight / drawers - 10, height: drWidth, quantity: drawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
          } else if (drawers > 0 && doors > 0) {
            const singleDrawerH = 150;
            const doorWidth = (width - 10) / doors;
            const doorH = baseHeight - drawers * singleDrawerH - 10;
            parts.push({ id: 'p-kl-door', name: 'Шүүгээний хаалга', width: doorWidth, height: doorH, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
            
            const drWidth = (width - 10);
            parts.push({ id: 'p-kl-dr-f', name: 'Шургуулганы нүүр', width: singleDrawerH - 10, height: drWidth, quantity: drawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
          }
        }
      }

      const partitions = sections.length - 1;
      const insideHeight = baseHeight - 36;

      for (let i = 0; i < partitions; i++) {
        parts.push({
          id: `p-kl-div-${i}`,
          name: `Дотор босоо хуваалт ${i + 1}`,
          width: depth - 20,
          height: insideHeight,
          quantity: 1,
          materialId,
          edgeBanding: '1mm',
          category: 'Хуваалт'
        });
      }

      if (shelves > 0) {
        if (partitions > 0) {
          sections.forEach((sec, sIdx) => {
            const qty = Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0);
            if (qty > 0) {
              parts.push({
                id: `p-kl-shelf-${sIdx}`,
                name: `Дотор тавиур (Секц ${sIdx+1})`,
                width: depth - 30,
                height: sec.width - 2,
                quantity: qty,
                materialId,
                edgeBanding: '1mm',
                category: 'Дээд тавиур'
              });
            }
          });
        } else {
          parts.push({ id: 'p-kl-shelf', name: 'Дотор тавиур', width: depth - 30, height: width - 38, quantity: shelves, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
        }
      }

      if (drawers > 0) {
        parts.push({ id: 'p-kl-dr-box', name: 'Шургуулга хайрцагны тал', width: 120, height: depth - 50, quantity: drawers * 2, materialId: 'mat-6', edgeBanding: '1mm', category: 'Шургуулга' });
      }

      parts.push({ id: 'p-kl-back', name: 'Ар тал (ХДФ)', width: width - 6, height: baseHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });

      if (config.countertopType && config.countertopType !== 'none') {
        const isStone = config.countertopType === 'stone';
        parts.push({
          id: 'p-kl-countertop',
          name: isStone ? 'Чулуун тавцан (Гал тогоо)' : 'Модон тавцан (Гал тогоо)',
          width: 600,
          height: width,
          quantity: 1,
          materialId: isStone ? 'mat-ct-stone' : 'mat-ct-wood',
          edgeBanding: 'all-sides',
          category: 'Дээд тавиур',
          notes: isStone ? 'Чулууны цехээс бэлтгүүлнэ' : 'Талбарт зүсэж угсарна'
        });
      }
      break;
    }

    case 'kitchen_upper': {
      parts.push({ id: 'p-ku-1', name: 'Дээд шүүгээний хажуу хана', width: depth, height: height, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      const insideWidth = width - 36;
      parts.push({ id: 'p-ku-2', name: 'Дээд таг хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-ku-3', name: 'Доод суурь хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      
      if (config.customDoors) {
        const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
        const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
        const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
        const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
        const customDoorHeight = config.doorHeight ? Number(config.doorHeight) : (height - 10);

        if (hasLeftDoor) {
          parts.push({ id: 'p-ku-door-left', name: 'Дээд шүүгээний хаалга (Зүүн)', width: customDoorWidth, height: customDoorHeight, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
        if (hasRightDoor) {
          parts.push({ id: 'p-ku-door-right', name: 'Дээд шүүгээний хаалга (Баруун)', width: customDoorWidth, height: customDoorHeight, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      } else {
        if (doors > 0) {
          const doorWidth = (width - 10) / doors;
          parts.push({ id: 'p-ku-door', name: 'Дээд шүүгээний хаалга', width: doorWidth, height: height - 10, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      }

      const sections = getCabinetSections(width, config, 'kitchen_upper');
      const partitions = sections.length - 1;
      const insideHeight = height - 36;

      for (let i = 0; i < partitions; i++) {
        parts.push({
          id: `p-ku-div-${i}`,
          name: `Дотор босоо хуваалт ${i + 1}`,
          width: depth - 20,
          height: insideHeight,
          quantity: 1,
          materialId,
          edgeBanding: '1mm',
          category: 'Хуваалт'
        });
      }

      if (shelves > 0) {
        if (partitions > 0) {
          sections.forEach((sec, sIdx) => {
            const qty = Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0);
            if (qty > 0) {
              parts.push({
                id: `p-ku-shelf-${sIdx}`,
                name: `Дотор тавиур (Секц ${sIdx+1})`,
                width: depth - 20,
                height: sec.width - 2,
                quantity: qty,
                materialId,
                edgeBanding: '1mm',
                category: 'Дээд тавиур'
              });
            }
          });
        } else {
          parts.push({ id: 'p-ku-shelf', name: 'Дотор тавиур', width: depth - 20, height: insideWidth - 2, quantity: shelves, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
        }
      }

      parts.push({ id: 'p-ku-back', name: 'Ар тал (ХДФ)', width: width - 6, height: height - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      break;
    }

    case 'cooktop': {
      const baseHeight = config.hasLegs ? height - 100 : height;
      parts.push({ id: 'p-ck-1', name: 'Зуухны их биеийн хажуу хана', width: depth, height: baseHeight, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-ck-2', name: 'Зуухны суурь хавтан', width: depth, height: width - 36, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      parts.push({ id: 'p-ck-3', name: 'Хөндлөн холбоос хавтан', width: 100, height: width - 36, quantity: 2, materialId, edgeBanding: 'none', category: 'Дээд тавиур' });
      parts.push({ id: 'p-ck-back', name: 'Ар тал (ХДФ)', width: width - 6, height: baseHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });

      if (config.countertopType && config.countertopType !== 'none') {
        const isStone = config.countertopType === 'stone';
        const ctMatId = isStone ? 'mat-ct-stone' : 'mat-ct-wood';
        parts.push({
          id: 'p-ck-countertop',
          name: isStone ? 'Чулуун тавцан (Плитк)' : 'Модон тавцан (Плитк)',
          width: 600,
          height: width,
          quantity: 1,
          materialId: ctMatId,
          edgeBanding: 'all-sides',
          category: 'Дээд тавиур',
          notes: isStone ? 'Чулууны цехээс бэлтгүүлнэ' : 'Талбарт зүсэж угсарна'
        });
      }
      break;
    }

    case 'sink': {
      const baseHeight = config.hasLegs ? height - 100 : height;
      parts.push({ id: 'p-sk-1', name: 'Угаалтуурын хажуу хана', width: depth, height: baseHeight, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-sk-2', name: 'Доод суурь хавтан', width: depth, height: width - 36, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      parts.push({ id: 'p-sk-3', name: 'Дээд холбоос хавтан', width: 100, height: width - 36, quantity: 2, materialId, edgeBanding: 'none', category: 'Дээд тавиур' });
      parts.push({ id: 'p-sk-back', name: 'Ар тал (ХДФ)', width: width - 6, height: baseHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });

      if (config.customDoors) {
        const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
        const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
        const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
        const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
        const customDoorHeight = config.doorHeight ? Number(config.doorHeight) : (baseHeight - 10);

        if (hasLeftDoor) {
          parts.push({ id: 'p-sk-door-left', name: 'Шүүгээний хаалга (Зүүн)', width: customDoorWidth, height: customDoorHeight, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
        if (hasRightDoor) {
          parts.push({ id: 'p-sk-door-right', name: 'Шүүгээний хаалга (Баруун)', width: customDoorWidth, height: customDoorHeight, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      } else {
        if (doors > 0) {
          const doorWidth = (width - 10) / doors;
          parts.push({ id: 'p-sk-door', name: 'Шүүгээний хаалга', width: doorWidth, height: baseHeight - 10, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      }

      if (config.countertopType && config.countertopType !== 'none') {
        const isStone = config.countertopType === 'stone';
        const ctMatId = isStone ? 'mat-ct-stone' : 'mat-ct-wood';
        parts.push({
          id: 'p-sk-countertop',
          name: isStone ? 'Чулуун тавцан (Угаалтуур)' : 'Модон тавцан (Угаалтуур)',
          width: 600,
          height: width,
          quantity: 1,
          materialId: ctMatId,
          edgeBanding: 'all-sides',
          category: 'Дээд тавиур',
          notes: isStone ? 'Угаалтуурын нүх гаргаж бэлтгэнэ' : 'Талбарт зүсэж угаалтуурын нүх гаргана'
        });
      }
      break;
    }

    case 'fridge':
    case 'hood':
    case 'tv_unit': {
      return [];
    }

    case 'microwave': {
      const insideWidth = width - 36;
      const parts: Part[] = [];
      const edge = '2mm';
      
      // Left and right side panels
      parts.push({ id: 'p-mw-1', name: 'Печний шүүгээний хажуу хана', width: depth, height: height, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      // Top and bottom covers
      parts.push({ id: 'p-mw-2', name: 'Печний шүүгээний дээд таг', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-mw-3', name: 'Печний шүүгээний доод суурь', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      
      // HDF Backing
      parts.push({ id: 'p-mw-back', name: 'Ар тал (ХДФ)', width: width - 6, height: height - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });

      // If the cabinet is tall enough, add a partition shelf and optionally doors
      const mwH = 360;
      if (height > mwH + 100) {
        parts.push({ id: 'p-mw-shelf', name: 'Печний суурь хэвтээ тавиур', width: depth - 20, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
        
        if (doors > 0) {
          const doorWidth = (width - 8) / doors;
          const doorH = height - (18 + mwH + 9) - 18;
          parts.push({ id: 'p-mw-door', name: 'Печний шүүгээний дээд хаалга', width: doorWidth, height: doorH, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      }
      return parts;
    }
    case 'built_in_hood': {
      const insideWidth = width - 36;
      const parts: Part[] = [];
      const edge = '2mm';
      
      // Left and right side panels
      parts.push({ id: 'p-bih-1', name: 'Шүүгээний хажуу хана', width: depth, height: height, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      // Top cover
      parts.push({ id: 'p-bih-2', name: 'Шүүгээний дээд таг', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      // Middle partition shelf (sits at height 150mm from bottom)
      parts.push({ id: 'p-bih-3', name: 'Бэхэлгээний дунд тавиур', width: depth - 20, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      
      // HDF Backing
      parts.push({ id: 'p-bih-back', name: 'Ар тал (ХДФ)', width: width - 6, height: height - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });

      // Inside shelves (if shelves > 0, placed in upper compartment)
      if (shelves > 0) {
        parts.push({ id: 'p-bih-shelf', name: 'Дотор тавиур хавтан', width: depth - 20, height: insideWidth - 2, quantity: shelves, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      }

      // Upper doors
      const doorH = height - 150 - 10;
      if (config.customDoors) {
        const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
        const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
        const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
        const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;

        if (hasLeftDoor) {
          parts.push({ id: 'p-bih-door-left', name: 'Шүүгээний хаалга (Зүүн)', width: customDoorWidth, height: doorH, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
        if (hasRightDoor) {
          parts.push({ id: 'p-bih-door-right', name: 'Шүүгээний хаалга (Баруун)', width: customDoorWidth, height: doorH, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      } else {
        if (doors > 0) {
          const doorWidth = (width - 10) / doors;
          parts.push({ id: 'p-bih-door', name: 'Шүүгээний хаалга', width: doorWidth, height: doorH, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      }
      return parts;
    }
    case 'vitrine': {
      const insideWidth = width - 36;
      const parts: Part[] = [];
      const edge = '2mm';
      const isLeftGlass = !!config.glassLeft;
      const isRightGlass = !!config.glassRight;

      // Left Side Panel
      if (isLeftGlass) {
        parts.push({ id: 'p-vi-side-l-glass', name: 'Шилэн хажуу хана (Зүүн)', width: depth - 40, height: height - 40, quantity: 1, materialId: 'mat-8', edgeBanding: 'none', category: 'Хажуу хана', notes: 'Төмөр нарийн араамд суурилуулна' });
        parts.push({ id: 'p-vi-side-l-frame', name: 'Төмөр хүрээний бэлдэц (Зүүн хажуу)', width: 45, height: height, quantity: 1, materialId: 'mat-4', edgeBanding: 'none', category: 'Хажуу хана' });
      } else {
        parts.push({ id: 'p-vi-side-l-wood', name: 'Хажуу босоо хана (Зүүн)', width: depth, height: height, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      }

      // Right Side Panel
      if (isRightGlass) {
        parts.push({ id: 'p-vi-side-r-glass', name: 'Шилэн хажуу хана (Баруун)', width: depth - 40, height: height - 40, quantity: 1, materialId: 'mat-8', edgeBanding: 'none', category: 'Хажуу хана', notes: 'Төмөр нарийн араамд суурилуулна' });
        parts.push({ id: 'p-vi-side-r-frame', name: 'Төмөр хүрээний бэлдэц (Баруун хажуу)', width: 45, height: height, quantity: 1, materialId: 'mat-4', edgeBanding: 'none', category: 'Хажуу хана' });
      } else {
        parts.push({ id: 'p-vi-side-r-wood', name: 'Хажуу босоо хана (Баруун)', width: depth, height: height, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      }

      // Top and Bottom Covers
      parts.push({ id: 'p-vi-top', name: 'Дээд таг хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-vi-bot', name: 'Доод суурь хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });

      // HDF Backing
      parts.push({ id: 'p-vi-back', name: 'Ар тал (ХДФ)', width: width - 6, height: height - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });

      // Glass Shelves
      if (shelves > 0) {
        parts.push({
          id: 'p-vi-shelf-glass',
          name: 'Шилэн тавиур хавтан',
          width: depth - 20,
          height: insideWidth - 2,
          quantity: shelves,
          materialId: 'mat-8',
          edgeBanding: 'none',
          category: 'Дээд тавиур',
          notes: 'Ирмэг өнгөлнө'
        });
      }

      // Front Door (Glass with slim metal frame)
      if (doors > 0) {
        const doorW = (width - 10) / doors;
        parts.push({
          id: 'p-vi-door-glass',
          name: 'Шилэн хаалга (Төмөр араамтай)',
          width: doorW - 10,
          height: height - 10,
          quantity: doors,
          materialId: 'mat-8',
          edgeBanding: 'none',
          category: 'Хаалга',
          notes: 'Нарийн төмөр хүрээтэй хаалга'
        });
        parts.push({
          id: 'p-vi-door-frame',
          name: 'Төмөр хаалганы хүрээ',
          width: 45,
          height: height - 10,
          quantity: doors * 2,
          materialId: 'mat-4',
          edgeBanding: 'none',
          category: 'Хаалга'
        });
      }

      return parts;
    }
    case 'cabinet': {
      const baseHeight = config.hasLegs ? height - 100 : height;
      const insideWidth = width - 36;
      const parts: Part[] = [];
      const edge = '2mm';

      // Side walls
      parts.push({ id: 'p-cb-side-l', name: 'Хажуу босоо хана (Зүүн)', width: depth, height: baseHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-cb-side-r', name: 'Хажуу босоо хана (Баруун)', width: depth, height: baseHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });

      // Top and Bottom Covers
      parts.push({ id: 'p-cb-top', name: 'Дээд таг хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-cb-bot', name: 'Доод суурь хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });

      // Back HDF
      parts.push({ id: 'p-cb-back', name: 'Ар тал (ХДФ)', width: width - 6, height: baseHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });

      // Layout partitioning using sections helper
      const sections = getCabinetSections(width, config);
      const panels = getCabinetFrontPanels(width, config);
      const partitions = sections.length - 1;

      // Dividers
      for (let i = 0; i < partitions; i++) {
        parts.push({ id: `p-cb-div-${i}`, name: `Дотор босоо хуваалт ${i + 1}`, width: depth - 20, height: baseHeight - 36, quantity: 1, materialId, edgeBanding: '1mm', category: 'Хуваалт' });
      }

      // Distribute doors, drawers, shelves across sections
      const numSections = sections.length;
      for (let j = 0; j < numSections; j++) {
        const sec = sections[j];
        const panel = panels[j];

        let secDrawers = 0;
        let secDoors = 0;

        // Distribute drawers and doors across all sections
        if (drawers > 0) {
          secDrawers = Math.floor(drawers / numSections) + (j < drawers % numSections ? 1 : 0);
        }
        if (doors > 0) {
          secDoors = Math.floor(doors / numSections) + (j < doors % numSections ? 1 : 0);
        }

        const sectionH = baseHeight - 10;
        const hasDrawersAndDoors = secDrawers > 0 && secDoors > 0;
        const drawerAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;
        const doorAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;

        if (secDrawers > 0) {
          // Drawers section (placed at the top if both drawers and doors exist)
          parts.push({ id: `p-cb-drawer-f-${j}`, name: `Шургуулганы нүүр хавтан`, width: Math.round(drawerAreaH / secDrawers - 5), height: panel.width, quantity: secDrawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
          parts.push({ id: `p-cb-drawer-s-${j}`, name: `Шургуулганы хажуу бэлдэц`, width: 120, height: depth - 50, quantity: secDrawers * 2, materialId: 'mat-6', edgeBanding: '1mm', category: 'Шургуулга' });
        }
        
        if (secDoors > 0) {
          // Door section (placed at the bottom if both drawers and doors exist)
          const doorW = (panel.width - 4 * (secDoors - 1)) / secDoors;
          for (let i = 0; i < secDoors; i++) {
            parts.push({
              id: `p-cb-door-down-${j}-${i}`,
              name: `ТВ тавиурын доошоо онгойх хаалга`,
              width: doorW - 4,
              height: Math.round(doorAreaH),
              quantity: 1,
              materialId: doorMaterialId,
              edgeBanding: edge,
              category: 'Хаалга',
              notes: 'Доошоо онгойх нугастай'
            });
          }
        }

        // Add shelves inside sections if they are door sections or open sections
        if (shelves > 0 && secDrawers === 0) {
          parts.push({ id: `p-cb-shelf-${j}`, name: `Дотор тавиур хавтан`, width: depth - 20, height: sec.width - 2, quantity: shelves, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
        }
      }

      return parts;
    }
    case 'corner_lower':
    case 'corner_upper': {
      const size = width; // Square corner footprint
      const isLower = type === 'corner_lower';
      const cEdge = '2mm';
      // Side panels (two walls at 90°)
      parts.push({ id: 'p-co-side1', name: 'Буланд тохирох хажуу хана (Зүүн)', width: size, height: height, quantity: 1, materialId, edgeBanding: cEdge, category: 'Хажуу хана' });
      parts.push({ id: 'p-co-side2', name: 'Буланд тохирох хажуу хана (Ар)', width: size, height: height, quantity: 1, materialId, edgeBanding: cEdge, category: 'Хажуу хана' });
      // Top and bottom panels (square - two pieces forming L)
      parts.push({ id: 'p-co-top', name: 'Буланд тохирох дээд таг', width: size - 18, height: size / 2, quantity: 2, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-co-bot', name: 'Буланд тохирох доод суурь', width: size - 18, height: size / 2, quantity: 2, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      // Back HDF panels
      parts.push({ id: 'p-co-back1', name: 'Ар тал (ХДФ) – Зүүн', width: size / 2, height: height - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      parts.push({ id: 'p-co-back2', name: 'Ар тал (ХДФ) – Ар', width: size / 2, height: height - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      // Doors on the two open faces
      const cornerDoors = (config.doors !== undefined && Number(config.doors) !== 0) ? Number(config.doors) : 2;
      if (cornerDoors > 0) {
        parts.push({ id: 'p-co-door1', name: 'Буланд тохирох хаалга (Урд)', width: size / 2 - 5, height: height - 10, quantity: 1, materialId: doorMaterialId, edgeBanding: cEdge, category: 'Хаалга' });
        parts.push({ id: 'p-co-door2', name: 'Буланд тохирох хаалга (Хажуу)', width: size / 2 - 5, height: height - 10, quantity: 1, materialId: doorMaterialId, edgeBanding: cEdge, category: 'Хаалга' });
      }
      if (isLower && config.countertopType && config.countertopType !== 'none') {
        const isStone = config.countertopType === 'stone';
        const ctMatId = isStone ? 'mat-ct-stone' : 'mat-ct-wood';
        // Corner countertop: two separate 600mm-wide pieces (back arm and front arm)
        parts.push({ id: 'p-co-ct-back', name: isStone ? 'Буланд чулуун тавцан (Ар)' : 'Буланд модон тавцан (Ар)', width: 600, height: size, quantity: 1, materialId: ctMatId, edgeBanding: 'all-sides', category: 'Дээд тавиур' });
        parts.push({ id: 'p-co-ct-front', name: isStone ? 'Буланд чулуун тавцан (Урд)' : 'Буланд модон тавцан (Урд)', width: 600, height: size, quantity: 1, materialId: ctMatId, edgeBanding: 'all-sides', category: 'Дээд тавиур' });
      }
      break;
    }

    case 'oven': {
      // Built-in oven — just a carcass/housing; the appliance itself is not fabricated
      parts.push({ id: 'p-ov-side', name: 'Духовойн хажуу хана', width: depth, height: height, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-ov-top', name: 'Духовойн дээд таг', width: width - 36, height: depth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-ov-bot', name: 'Духовойн доод суурь', width: width - 36, height: depth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      parts.push({ id: 'p-ov-back', name: 'Духовойн ар тал (ХДФ)', width: width, height: height, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      break;
    }

    case 'dishwasher': {
      // Dishwasher — front panel + carcass; appliance is separate
      parts.push({ id: 'p-dw-side', name: 'Угаалгын машины хажуу хана', width: depth, height: height, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-dw-top', name: 'Угаалгын машины дээд таг', width: width - 36, height: depth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-dw-back', name: 'Угаалгын машины ар тал (ХДФ)', width: width, height: height, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      // Decorative front panel
      if (doors > 0) {
        parts.push({ id: 'p-dw-door', name: 'Угаалгын машины нүүрний хавтан', width: width - 4, height: height - 4, quantity: 1, materialId: doorMaterialId, edgeBanding: '2mm', category: 'Хаалга' });
      }
      break;
    }

    default: {
      parts.push({ id: 'p-d-1', name: 'Хажуу босоо хавтан', width: depth, height: height, quantity: 2, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-d-2', name: 'Дээд/Доод таг', width: depth, height: width - 36, quantity: 2, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      if (shelves > 0) {
        parts.push({ id: 'p-d-shelf', name: 'Дунд тавиур', width: depth - 10, height: width - 38, quantity: shelves, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      }
      
      if (config.customDoors) {
        const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
        const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
        const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
        const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
        const customDoorHeight = config.doorHeight ? Number(config.doorHeight) : (height - 10);

        if (hasLeftDoor) {
          parts.push({ id: 'p-d-door-left', name: 'Шүүгээний хаалга (Зүүн)', width: customDoorWidth, height: customDoorHeight, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
        if (hasRightDoor) {
          parts.push({ id: 'p-d-door-right', name: 'Шүүгээний хаалга (Баруун)', width: customDoorWidth, height: customDoorHeight, quantity: 1, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      } else {
        if (doors > 0) {
          const doorWidth = (width - 10) / doors;
          parts.push({ id: 'p-d-door', name: 'Шүүгээний хаалга', width: doorWidth, height: height - 10, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
        }
      }
      break;
    }
  }

  // Add plinth/socle boards to carcass parts calculation if hasLegs is enabled and plinth style is selected
  if (config.hasLegs && (config.legStyle || 'plinth') !== 'cylinder') {
    const plinthHeight = 100;
    parts.push({
      id: 'p-plinth-front',
      name: 'Урд хаалт хавтан (Хөл)',
      width: plinthHeight,
      height: width,
      quantity: 1,
      materialId,
      edgeBanding: '1mm',
      category: 'Хажуу хана'
    });
    parts.push({
      id: 'p-plinth-side',
      name: 'Хажуу хаалт хавтан (Хөл)',
      width: plinthHeight,
      height: Math.max(100, depth - 68),
      quantity: 2,
      materialId,
      edgeBanding: '1mm',
      category: 'Хажуу хана'
    });
    parts.push({
      id: 'p-plinth-back',
      name: 'Ар хаалт хавтан (Хөл)',
      width: plinthHeight,
      height: Math.max(100, width - 36),
      quantity: 1,
      materialId,
      edgeBanding: 'none',
      category: 'Хажуу хана'
    });
  }

  return parts.map(p => ({
    ...p,
    width: Math.round(p.width),
    height: Math.round(p.height)
  }));
};

const rebuildPartsFromModules = (modules: CabinetModule[]): Part[] => {
  const parts: Part[] = [];
  modules.forEach((mod) => {
    // Always use mod.parts as the source of truth.
    // Parts are calculated when a module is added/config changes; deletions are preserved.
    mod.parts.forEach((p) => {
      const prefix = `${mod.id}-`;
      const compositeId = p.id.startsWith(prefix) ? p.id : `${prefix}${p.id}`;
      const namePrefix = `${mod.name} - `;
      const compositeName = p.name.startsWith(namePrefix) ? p.name : `${namePrefix}${p.name}`;
      
      parts.push({
        ...p,
        id: compositeId,
        name: compositeName
      });
    });
  });
  return parts;
};


const ensureProjectModules = (project: Project): Project => {
  if (!project) return project;
  try {
    if (project.modules && project.modules.length > 0) {
      const populatedModules = project.modules.map((mod) => {
        if (!mod) return mod;
        const freshCarcassParts = calculateDynamicParts(mod.type, mod.config) || [];
        if (!mod.parts || mod.parts.length === 0) {
          return {
            ...mod,
            parts: freshCarcassParts
          };
        }
        const updatedParts = mod.parts
          .filter((p) => {
            if (!p) return false;
            const isManual = p.id.includes('manual') || p.id.startsWith('p-manual-');
            const existsInFresh = freshCarcassParts.some((fp) => fp && fp.id === p.id);
            return isManual || existsInFresh;
          })
          .map((p) => {
            const fresh = freshCarcassParts.find((fp) => fp && fp.id === p.id);
            if (fresh) {
              return {
                ...p,
                width: fresh.width,
                height: fresh.height,
                materialId: fresh.materialId
              };
            }
            return p;
          });
        return {
          ...mod,
          parts: updatedParts
        };
      });
      const populated = { ...project, modules: populatedModules };
      populated.parts = rebuildPartsFromModules(populatedModules);
      return populated;
    }

    // Legacy: project has no modules yet — create a default single module
    const defaultModule: CabinetModule = {
      id: `mod-${project.id}-1`,
      name: project.name,
      type: project.furnitureType,
      config: project.config,
      parts: calculateDynamicParts(project.furnitureType, project.config) || [],
      xOffset: 0,
      yOffset: 0,
      zOffset: 0
    };
    const migratedProject = { ...project, modules: [defaultModule] };
    migratedProject.parts = rebuildPartsFromModules(migratedProject.modules);
    return migratedProject;
  } catch (err) {
    console.warn("[ensureProjectModules] failed to migrate project:", err);
    return project; // Return unmigrated fallback rather than crashing
  }
};


const INITIALIZED_PROJECTS = INITIAL_PROJECTS.map(p => ensureProjectModules(p));

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
  projects: INITIALIZED_PROJECTS,
  activeProject: INITIALIZED_PROJECTS[0], // Start with first project active
  selectedModuleId: INITIALIZED_PROJECTS[0].modules?.[0]?.id || null,
  materials: DEFAULT_MATERIALS,
  customTemplates: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tavmax-custom-templates') || '[]') : [],
  savedLayouts: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tavmax-saved-layouts') || '[]') : [],

  addProject: (project) => set((state) => {
    const initialized = ensureProjectModules(project);
    return { projects: [...state.projects, initialized] };
  }),

  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id),
    activeProject: state.activeProject?.id === id ? null : state.activeProject,
    selectedModuleId: state.activeProject?.id === id ? null : state.selectedModuleId
  })),

  setActiveProject: (project) => set((state) => {
    if (!project) return { activeProject: null, selectedModuleId: null };
    const initialized = ensureProjectModules(project);
    return {
      activeProject: initialized,
      selectedModuleId: initialized.modules && initialized.modules.length > 0 ? initialized.modules[0].id : null
    };
  }),

  setSelectedModuleId: (id) => set({ selectedModuleId: id }),

  updateActiveConfig: (config) => set((state) => {
    if (!state.activeProject) return {};
    
    const targetModuleId = state.selectedModuleId || (state.activeProject.modules && state.activeProject.modules[0]?.id);
    
    if (!targetModuleId) {
      // If there are no modules at all, just update the project config
      const updatedProject = {
        ...state.activeProject,
        config: { ...state.activeProject.config, ...config },
        updatedAt: new Date().toISOString()
      };
      return {
        activeProject: updatedProject,
        projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
      };
    }
    
    const globalKeys = [] as const;
    const globalUpdates: Partial<FurnitureConfig> = {};
    globalKeys.forEach((key) => {
      if (config[key] !== undefined) {
        globalUpdates[key] = config[key] as any;
      }
    });
    const hasGlobalUpdates = Object.keys(globalUpdates).length > 0;

    // Find and update the target module
    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      const isTarget = mod.id === targetModuleId;
      
      if (!isTarget && !hasGlobalUpdates) {
        return mod;
      }

      let updatedConfig: FurnitureConfig;

      if (isTarget) {
        const getDefaultPartitions = (type: string, cfg: any) => {
          if (type === 'wardrobe') return cfg.doors > 1 ? cfg.doors - 1 : 0;
          if (type === 'cabinet') return cfg.doors > 0 ? (cfg.drawers > 0 ? cfg.doors : cfg.doors - 1) : 0;
          return 0;
        };

        const oldWidth = mod.config.width;
        const newWidth = config.width !== undefined ? config.width : oldWidth;
        const oldPartitions = mod.config.partitions !== undefined ? mod.config.partitions : getDefaultPartitions(mod.type, mod.config);
        const newPartitions = config.partitions !== undefined ? config.partitions : oldPartitions;

        const oldHeight = mod.config.height;
        const newHeight = config.height !== undefined ? config.height : oldHeight;
        const oldHasLegs = mod.config.hasLegs;
        const newHasLegs = config.hasLegs !== undefined ? config.hasLegs : oldHasLegs;
        
        const oldShelves = mod.config.shelves !== undefined ? Number(mod.config.shelves) : 0;
        const newShelves = config.shelves !== undefined ? Number(config.shelves) : oldShelves;

        updatedConfig = { ...mod.config, ...config };

        // Handle partition count changes
        if (newPartitions !== oldPartitions) {
          const newPositions = [];
          for (let i = 0; i < newPartitions; i++) {
            newPositions.push(Math.round((i + 1) * newWidth / (newPartitions + 1)));
          }
          updatedConfig.dividerPositions = newPositions;
          updatedConfig.partitions = newPartitions;

          // Recalculate shelf positions and section counts because sections layout changed
          const legHeight = newHasLegs ? 100 : 0;
          const insideHeight = newHeight - legHeight - 36;
          const newPositionsShelves = [];
          if (mod.type === 'wardrobe' || mod.type === 'bookshelf' || (newPartitions > 0 && (mod.type === 'custom' || mod.type === 'kitchen_lower' || mod.type === 'kitchen_upper'))) {
            const sections = getCabinetSections(newWidth, updatedConfig, mod.type);
            const newCounts = sections.map((_, sIdx) =>
              Math.floor(newShelves / sections.length) + (sIdx < newShelves % sections.length ? 1 : 0)
            );
            sections.forEach((sec, sIdx) => {
              const shelvesInSec = newCounts[sIdx];
              const step = insideHeight / (shelvesInSec + 1);
              for (let i = 0; i < shelvesInSec; i++) {
                newPositionsShelves.push(Math.round((i + 1) * step));
              }
            });
            updatedConfig.sectionShelfCounts = newCounts;
            updatedConfig.shelfPositions = newPositionsShelves;
          } else {
            const step = insideHeight / (newShelves + 1);
            for (let i = 0; i < newShelves; i++) {
              newPositionsShelves.push(Math.round((i + 1) * step));
            }
            updatedConfig.shelfPositions = newPositionsShelves;
          }
        }
        // Handle width resizing (scale divider positions proportionally)
        else if (newWidth !== oldWidth && mod.config.dividerPositions && mod.config.dividerPositions.length > 0) {
          const ratio = newWidth / oldWidth;
          updatedConfig.dividerPositions = mod.config.dividerPositions.map(pos => Math.round(pos * ratio));
        }

        // Handle shelves count changes
        if (newShelves !== oldShelves || (newShelves > 0 && (!updatedConfig.shelfPositions || updatedConfig.shelfPositions.length !== newShelves))) {
          const legHeight = newHasLegs ? 100 : 0;
          const insideHeight = newHeight - legHeight - 36;
          const newPositions = [];
          
          if (mod.type === 'wardrobe' || mod.type === 'bookshelf' || (newPartitions > 0 && (mod.type === 'custom' || mod.type === 'kitchen_lower' || mod.type === 'kitchen_upper'))) {
            const sections = getCabinetSections(newWidth, updatedConfig, mod.type);
            const storedCounts: number[] | undefined = updatedConfig.sectionShelfCounts;
            const hasValidStored = storedCounts && storedCounts.length === sections.length && storedCounts.reduce((a, b) => a + b, 0) === newShelves;
            const newCounts = hasValidStored ? storedCounts! : sections.map((_, sIdx) =>
              Math.floor(newShelves / sections.length) + (sIdx < newShelves % sections.length ? 1 : 0)
            );

            sections.forEach((sec, sIdx) => {
              const shelvesInSec = newCounts[sIdx];
              const step = insideHeight / (shelvesInSec + 1);
              for (let i = 0; i < shelvesInSec; i++) {
                newPositions.push(Math.round((i + 1) * step));
              }
            });
            updatedConfig.sectionShelfCounts = newCounts;
          } else {
            const step = insideHeight / (newShelves + 1);
            for (let i = 0; i < newShelves; i++) {
              newPositions.push(Math.round((i + 1) * step));
            }
          }
          
          updatedConfig.shelfPositions = newPositions;
          updatedConfig.shelves = newShelves;
        }
        // Handle height or hasLegs changes (scale shelf positions proportionally)
        else if ((newHeight !== oldHeight || newHasLegs !== oldHasLegs) && mod.config.shelfPositions && mod.config.shelfPositions.length > 0) {
          const oldLeg = oldHasLegs ? 100 : 0;
          const newLeg = newHasLegs ? 100 : 0;
          const oldInside = oldHeight - oldLeg - 36;
          const newInside = newHeight - newLeg - 36;
          const ratio = newInside / oldInside;
          updatedConfig.shelfPositions = mod.config.shelfPositions.map(pos => Math.max(10, Math.round(pos * ratio)));
        }
      } else {
        updatedConfig = { ...mod.config, ...globalUpdates };
      }

      // Rebuild parts list
      let updatedParts: Part[];
      if (mod.type === 'custom') {
        const carcassParts = calculateDynamicParts(mod.type, updatedConfig);
        const manualParts = mod.parts.filter(p => p.id.includes('manual') || p.id.startsWith('p-manual-'));
        updatedParts = [...carcassParts, ...manualParts];
      } else {
        updatedParts = calculateDynamicParts(mod.type, updatedConfig);
      }
        
      return {
        ...mod,
        config: updatedConfig,
        parts: updatedParts
      };
    });

    const combinedParts = rebuildPartsFromModules(updatedModules);
    const activeMod = updatedModules.find((m) => m.id === targetModuleId);
    const rootConfig = activeMod ? activeMod.config : state.activeProject.config;

    const newCtThickness = config.countertopThickness;
    let updatedMaterials = state.materials;
    if (newCtThickness !== undefined) {
      updatedMaterials = state.materials.map(m => 
        (m.id === 'mat-ct-wood' || m.id === 'mat-ct-stone') 
          ? { ...m, thickness: newCtThickness } 
          : m
      );
    }

    const updatedProject = {
      ...state.activeProject,
      config: rootConfig,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p),
      materials: updatedMaterials
    };
  }),

  updateActiveParts: (parts) => set((state) => {
    if (!state.activeProject) return {};

    const targetModuleId = state.selectedModuleId || (state.activeProject.modules && state.activeProject.modules[0]?.id);
    if (!targetModuleId) return {};

    // For simplicity, update parts of the target module
    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      if (mod.id === targetModuleId) {
        return {
          ...mod,
          parts
        };
      }
      return mod;
    });

    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  updateProjectStatus: (id, status) => set((state) => {
    const updatedProjects = state.projects.map((p) =>
      p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p
    );
    return {
      projects: updatedProjects,
      activeProject: state.activeProject?.id === id
        ? { ...state.activeProject, status, updatedAt: new Date().toISOString() }
        : state.activeProject
    };
  }),

  addPartToActive: (part) => set((state) => {
    if (!state.activeProject) return {};

    const targetModuleId = state.selectedModuleId || (state.activeProject.modules && state.activeProject.modules[0]?.id);
    if (!targetModuleId) return {};

    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      if (mod.id === targetModuleId) {
        const newPart = {
          ...part,
          id: `p-manual-${Date.now()}`,
          xOffset: (part as any).xOffset ?? 0,
          yOffset: (part as any).yOffset ?? 0,
          zOffset: (part as any).zOffset ?? 0
        };
        return {
          ...mod,
          parts: [...mod.parts, newPart]
        };
      }
      return mod;
    });

    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  removePartFromActive: (partId) => set((state) => {
    if (!state.activeProject) return {};

    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      const filteredParts = mod.parts.filter((p) => {
        const compositeId = p.id.startsWith(mod.id) ? p.id : `${mod.id}-${p.id}`;
        return compositeId !== partId && p.id !== partId;
      });

      return {
        ...mod,
        parts: filteredParts
      };
    });

    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  updatePartInActive: (partId, updated) => set((state) => {
    if (!state.activeProject) return {};

    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      const updatedParts = mod.parts.map((p) => {
        const compositeId = p.id.startsWith(mod.id) ? p.id : `${mod.id}-${p.id}`;
        if (compositeId === partId || p.id === partId) {
          return { ...p, ...updated };
        }
        return p;
      });

      return {
        ...mod,
        parts: updatedParts
      };
    });

    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  generatePartsForActive: () => set((state) => {
    if (!state.activeProject) return {};

    const targetModuleId = state.selectedModuleId || (state.activeProject.modules && state.activeProject.modules[0]?.id);
    if (!targetModuleId) return {};

    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      if (mod.id === targetModuleId) {
        return {
          ...mod,
          parts: calculateDynamicParts(mod.type, mod.config)
        };
      }
      return mod;
    });

    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  changeActiveFurnitureType: (type, incomingConfig) => set((state) => {
    if (!state.activeProject) return {};

    const projectConfig = state.activeProject.config || {};
    const newConfig = {
      ...incomingConfig,
      materialId: projectConfig.materialId !== undefined ? projectConfig.materialId : incomingConfig.materialId,
      doorMaterialId: projectConfig.doorMaterialId !== undefined ? projectConfig.doorMaterialId : incomingConfig.doorMaterialId,
      doorStyle: projectConfig.doorStyle !== undefined ? projectConfig.doorStyle : incomingConfig.doorStyle,
      color: projectConfig.color !== undefined ? projectConfig.color : incomingConfig.color,
      bodyColor: projectConfig.bodyColor !== undefined ? projectConfig.bodyColor : incomingConfig.bodyColor,
    };

    const targetModuleId = state.selectedModuleId || (state.activeProject.modules && state.activeProject.modules[0]?.id);
    if (!targetModuleId) return {};

    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      if (mod.id === targetModuleId) {
        const updatedParts = calculateDynamicParts(type, newConfig);
        return {
          ...mod,
          type,
          config: newConfig,
          parts: updatedParts
        };
      }
      return mod;
    });

    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      furnitureType: type,
      config: newConfig,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  addModuleToActive: (type, incomingConfig, name) => set((state) => {
    if (!state.activeProject) return {};

    const projectConfig = state.activeProject.config || {};
    const config = {
      ...incomingConfig,
      materialId: incomingConfig.materialId !== undefined ? incomingConfig.materialId : (projectConfig.materialId !== undefined ? projectConfig.materialId : 'mat-3'),
      doorMaterialId: incomingConfig.doorMaterialId !== undefined ? incomingConfig.doorMaterialId : (projectConfig.doorMaterialId !== undefined ? projectConfig.doorMaterialId : 'mat-3'),
      doorStyle: incomingConfig.doorStyle !== undefined ? incomingConfig.doorStyle : (projectConfig.doorStyle !== undefined ? projectConfig.doorStyle : 'flat'),
      color: incomingConfig.color !== undefined ? incomingConfig.color : (projectConfig.color !== undefined ? projectConfig.color : '#faf9f6'),
      bodyColor: incomingConfig.bodyColor !== undefined ? incomingConfig.bodyColor : projectConfig.bodyColor,
    };

    const modules = state.activeProject.modules || [];
    let initialX: number;
    const isUpper = (type === 'kitchen_upper' || type === 'hood' || type === 'built_in_hood' || type === 'microwave');
    let initialY = isUpper ? 1400 : 0;
    let initialZ = 0;
    
    // Find currently selected module to place relative to it
    const selectedMod = modules.find(m => m.id === state.selectedModuleId);
    
    if (selectedMod) {
      // Place next to the selected module
      initialX = selectedMod.xOffset + selectedMod.config.width / 2 + config.width / 2 + 10;
      initialY = selectedMod.yOffset;
      // Force correct height level if the selected module height is on a different row than the new module
      if (isUpper && selectedMod.yOffset < 1000) {
        initialY = 1400;
      }
      if (!isUpper && selectedMod.yOffset >= 1000) {
        initialY = 0;
      }
      initialZ = selectedMod.zOffset;
    } else {
      // Fallback: row-aware rightmost positioning
      const upperModules = modules.filter(m => m.type === 'kitchen_upper' || m.type === 'hood' || m.type === 'built_in_hood' || m.type === 'microwave');
      const lowerModules = modules.filter(m => !(m.type === 'kitchen_upper' || m.type === 'hood' || m.type === 'built_in_hood' || m.type === 'microwave'));

      if (isUpper) {
        if (upperModules.length > 0) {
          let maxRight = -Infinity;
          upperModules.forEach((m) => {
            const rightEdge = m.xOffset + m.config.width / 2;
            if (rightEdge > maxRight) {
              maxRight = rightEdge;
            }
          });
          initialX = maxRight + config.width / 2 + 10;
        } else if (lowerModules.length > 0) {
          let minLeft = Infinity;
          let matchingModule = lowerModules[0];
          lowerModules.forEach((m) => {
            if (m.xOffset < minLeft) {
              minLeft = m.xOffset;
              matchingModule = m;
            }
          });
          initialX = matchingModule.xOffset;
        } else {
          initialX = 0;
        }
      } else {
        if (lowerModules.length > 0) {
          let maxRight = -Infinity;
          lowerModules.forEach((m) => {
            const rightEdge = m.xOffset + m.config.width / 2;
            if (rightEdge > maxRight) {
              maxRight = rightEdge;
            }
          });
          initialX = maxRight + config.width / 2 + 10;
        } else if (upperModules.length > 0) {
          let minLeft = Infinity;
          let matchingModule = upperModules[0];
          upperModules.forEach((m) => {
            if (m.xOffset < minLeft) {
              minLeft = m.xOffset;
              matchingModule = m;
            }
          });
          initialX = matchingModule.xOffset;
        } else {
          initialX = 0;
        }
      }
    }

    const modId = `mod-${Date.now()}`;
    const newModule: CabinetModule = {
      id: modId,
      name: name || `Хайрцаг / Хэсэг ${ modules.length + 1 }`,
      type,
      config,
      parts: calculateDynamicParts(type, config),
      xOffset: initialX,
      yOffset: initialY,
      zOffset: initialZ
    };

    const updatedModules = [...(state.activeProject.modules || []), newModule];
    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      selectedModuleId: modId,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  removeModuleFromActive: (moduleId) => set((state) => {
    if (!state.activeProject) return {};

    if ((state.activeProject.modules || []).length <= 1) return {};

    const updatedModules = (state.activeProject.modules || []).filter((m) => m.id !== moduleId);
    const combinedParts = rebuildPartsFromModules(updatedModules);

    const nextSelectedId = state.selectedModuleId === moduleId
      ? updatedModules[0].id
      : state.selectedModuleId;

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      selectedModuleId: nextSelectedId,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  updateModulePosition: (moduleId, x, y, z) => set((state) => {
    if (!state.activeProject) return {};

    const updatedModules = (state.activeProject.modules || []).map((mod) => {
      if (mod.id === moduleId) {
        return {
          ...mod,
          xOffset: x,
          yOffset: y,
          zOffset: z
        };
      }
      return mod;
    });

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  updateModuleRotation: (moduleId, rotationDeg) => set((state) => {
    if (!state.activeProject) return {};
    const radians = (rotationDeg * Math.PI) / 180;
    const updatedModules = (state.activeProject.modules || []).map((mod) =>
      mod.id === moduleId ? { ...mod, rotation: radians } : mod
    );
    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      updatedAt: new Date().toISOString()
    };
    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  duplicateModule: (moduleId) => set((state) => {
    if (!state.activeProject) return {};

    const sourceMod = (state.activeProject.modules || []).find((m) => m.id === moduleId);
    if (!sourceMod) return {};

    const modId = `mod-${Date.now()}`;
    const newModule: CabinetModule = {
      ...sourceMod,
      id: modId,
      name: `${sourceMod.name} (Хуулбар)`,
      xOffset: sourceMod.xOffset + sourceMod.config.width + 100, // Place to the right of source
      yOffset: sourceMod.yOffset,
      zOffset: sourceMod.zOffset
    };

    const updatedModules = [...(state.activeProject.modules || []), newModule];
    const combinedParts = rebuildPartsFromModules(updatedModules);

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      parts: combinedParts,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      selectedModuleId: modId,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  resetModulePositions: () => set((state) => {
    if (!state.activeProject) return {};

    const modules = state.activeProject.modules || [];

    // Separate modules into lower, upper, and TV
    const isTV = (m: CabinetModule) => m.type === 'tv_unit';
    const isUpper = (m: CabinetModule) =>
      (m.type === 'kitchen_upper' || m.type === 'hood' || m.type === 'built_in_hood' || m.type === 'microwave') &&
      (m.config.height ?? 0) < 1000;

    const lowerMods = modules.filter((m) => !isUpper(m) && !isTV(m));
    const upperMods = modules.filter((m) => isUpper(m) && !isTV(m));
    const tvMods = modules.filter(isTV);

    // Split lower row: first half → front wall (along X), second half → side wall (along Z)
    const frontCount = Math.ceil(lowerMods.length / 2);
    const sideCount = lowerMods.length - frontCount;

    // Place front-wall lowers along X (centered around 0)
    let frontTotalW = lowerMods.slice(0, frontCount).reduce((s, m) => s + m.config.width, 0)
      + Math.max(0, frontCount - 1) * 0;
    let frontX = -frontTotalW / 2;

    const updatedLower = lowerMods.map((mod, idx) => {
      let xOff = 0, zOff = 0;
      if (idx < frontCount) {
        // Front wall — along X axis
        xOff = frontX + mod.config.width / 2;
        frontX += mod.config.width;
        zOff = 0;
      } else {
        // Side wall — along Z axis (at left edge, going backward)
        const sideIdx = idx - frontCount;
        const leftEdge = -frontTotalW / 2 - mod.config.depth / 2;
        const sideZ = (sideIdx + 0.5) * (mod.config.width);
        xOff = leftEdge;
        zOff = sideZ;
      }
      return { ...mod, xOffset: xOff, yOffset: 0, zOffset: zOff };
    });

    // Place uppers above front-wall lowers (same X sequence)
    let upperX = -frontTotalW / 2;
    const updatedUpper = upperMods.map((mod) => {
      const xOff = upperX + mod.config.width / 2;
      upperX += mod.config.width;
      return { ...mod, xOffset: xOff, yOffset: 1400, zOffset: 0 };
    });

    // Snap TVs to their closest cabinet/furniture module
    const alignedTVs = tvMods.map((tv) => {
      let closestCabinet = null;
      let minDistance = Infinity;
      lowerMods.forEach((cab) => {
        const dist = Math.abs(tv.xOffset - cab.xOffset);
        if (dist < minDistance) {
          minDistance = dist;
          closestCabinet = cab;
        }
      });
      if (closestCabinet) {
        const alignedCabinet = updatedLower.find((c) => c.id === closestCabinet.id);
        if (alignedCabinet) {
          const xDiff = tv.xOffset - closestCabinet.xOffset;
          const yDiff = tv.yOffset - closestCabinet.config.height;
          const zDiff = tv.zOffset - closestCabinet.zOffset;
          return {
            ...tv,
            xOffset: alignedCabinet.xOffset + xDiff,
            yOffset: alignedCabinet.config.height + yDiff,
            zOffset: alignedCabinet.zOffset + zDiff
          };
        }
      }
      return tv;
    });

    const updatedModules = [
      ...modules.map((m) => {
        const found = [...updatedLower, ...updatedUpper, ...alignedTVs].find((u) => u.id === m.id);
        return found || m;
      })
    ];

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),

  alignModulesSideBySide: () => set((state) => {
    if (!state.activeProject || !state.activeProject.modules || state.activeProject.modules.length === 0) return {};

    const modules = state.activeProject.modules || [];

    // Separate modules into lower, upper, and TV based on height and Y-offset
    const isTV = (m: CabinetModule) => m.type === 'tv_unit';
    const isUpper = (m: CabinetModule) =>
      m.yOffset >= 500 && (m.config.height ?? 0) < 1000;

    const lowerMods = modules.filter((m) => !isUpper(m) && !isTV(m));
    const upperMods = modules.filter((m) => isUpper(m) && !isTV(m));
    const tvMods = modules.filter(isTV);

    // Sort lower modules by current xOffset
    const sortedLower = [...lowerMods].sort((a, b) => a.xOffset - b.xOffset);
    const totalLowerWidth = sortedLower.reduce((sum, mod) => sum + (mod.config.width || 0), 0);

    // Place lower modules side-by-side (along X, centered around 0)
    let currentLowerLeft = -totalLowerWidth / 2;
    const alignedLower = sortedLower.map((mod) => {
      const w = mod.config.width || 0;
      const xOff = Math.round(currentLowerLeft + w / 2);
      currentLowerLeft += w;
      return {
        ...mod,
        xOffset: xOff,
        yOffset: 0, // floor level
        zOffset: 0
      };
    });

    // Sort upper modules by current xOffset
    const sortedUpper = [...upperMods].sort((a, b) => a.xOffset - b.xOffset);
    const totalUpperWidth = sortedUpper.reduce((sum, mod) => sum + (mod.config.width || 0), 0);

    // Place upper modules side-by-side (along X, centered around 0, keeping their floating height)
    let currentUpperLeft = -totalUpperWidth / 2;
    const alignedUpper = sortedUpper.map((mod) => {
      const w = mod.config.width || 0;
      const xOff = Math.round(currentUpperLeft + w / 2);
      currentUpperLeft += w;
      return {
        ...mod,
        xOffset: xOff,
        yOffset: mod.yOffset, // preserve custom height
        zOffset: 0
      };
    });

    // Snap TVs to their closest cabinet/furniture module
    const alignedTVs = tvMods.map((tv) => {
      let closestCabinet = null;
      let minDistance = Infinity;
      lowerMods.forEach((cab) => {
        const dist = Math.abs(tv.xOffset - cab.xOffset);
        if (dist < minDistance) {
          minDistance = dist;
          closestCabinet = cab;
        }
      });
      if (closestCabinet) {
        const alignedCabinet = alignedLower.find((c) => c.id === closestCabinet.id);
        if (alignedCabinet) {
          const xDiff = tv.xOffset - closestCabinet.xOffset;
          const yDiff = tv.yOffset - closestCabinet.config.height;
          const zDiff = tv.zOffset - closestCabinet.zOffset;
          return {
            ...tv,
            xOffset: alignedCabinet.xOffset + xDiff,
            yOffset: alignedCabinet.config.height + yDiff,
            zOffset: alignedCabinet.zOffset + zDiff
          };
        }
      }
      return tv;
    });

    const updatedModules = modules.map((m) => {
      const found = [...alignedLower, ...alignedUpper, ...alignedTVs].find((u) => u.id === m.id);
      return found || m;
    });

    const updatedProject = {
      ...state.activeProject,
      modules: updatedModules,
      updatedAt: new Date().toISOString()
    };

    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) => p.id === state.activeProject!.id ? updatedProject : p)
    };
  }),


  updateMaterialPrice: (materialId, price) => set((state) => ({
    materials: state.materials.map((m) => m.id === materialId ? { ...m, price } : m)
  })),

  addCustomTemplate: (name, type, config) => set((state) => {
    const newTpl = {
      id: `tpl-custom-${Date.now()}`,
      name,
      type,
      config
    };
    const updated = [...state.customTemplates, newTpl];
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-custom-templates', JSON.stringify(updated));
    }
    return { customTemplates: updated };
  }),

  deleteCustomTemplate: (id) => set((state) => {
    const updated = state.customTemplates.filter((t) => t.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-custom-templates', JSON.stringify(updated));
    }
    return { customTemplates: updated };
  }),

  saveLayout: (name) => set((state) => {
    if (!state.activeProject?.modules?.length) return {};
    const snapshot: LayoutTemplate = {
      id: `layout-${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      modules: state.activeProject.modules.map((m) => ({ ...m })),
      moduleCount: state.activeProject.modules.length,
    };
    const updated = [...state.savedLayouts, snapshot];
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-saved-layouts', JSON.stringify(updated));
    }
    return { savedLayouts: updated };
  }),

  deleteLayout: (id) => set((state) => {
    const updated = state.savedLayouts.filter((l) => l.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-saved-layouts', JSON.stringify(updated));
    }
    return { savedLayouts: updated };
  }),

  loadLayout: (id) => set((state) => {
    const layout = state.savedLayouts.find((l) => l.id === id);
    if (!layout || !state.activeProject) return {};
    // Re-assign fresh IDs so modules don't conflict with existing ones
    const freshModules = layout.modules.map((m) => ({
      ...m,
      id: `mod-loaded-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    const updatedProject = {
      ...state.activeProject,
      modules: freshModules,
      parts: freshModules.flatMap((m) => m.parts),
      updatedAt: new Date().toISOString(),
    };
    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) =>
        p.id === state.activeProject!.id ? updatedProject : p
      ),
      selectedModuleId: freshModules[0]?.id || null,
    };
  }),

  clearAllModules: () => set((state) => {
    if (!state.activeProject) return {};
    const updatedProject = {
      ...state.activeProject,
      modules: [],
      parts: [],
      updatedAt: new Date().toISOString(),
    };
    return {
      activeProject: updatedProject,
      projects: state.projects.map((p) =>
        p.id === state.activeProject!.id ? updatedProject : p
      ),
      selectedModuleId: null,
    };
  })
    }),
    {
      name: 'tavmax-project-storage',
      partialize: (state) => ({
        projects: state.projects,
        activeProject: state.activeProject,
        selectedModuleId: state.selectedModuleId,
        materials: state.materials,
        savedLayouts: state.savedLayouts,
        customTemplates: state.customTemplates,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate project storage', error);
          return;
        }
        if (state) {
          try {
            state.customTemplates = JSON.parse(localStorage.getItem('tavmax-custom-templates') || '[]');
          } catch (e) {
            console.warn("Failed to load custom templates:", e);
            state.customTemplates = [];
          }
          try {
            state.savedLayouts = JSON.parse(localStorage.getItem('tavmax-saved-layouts') || '[]');
          } catch (e) {
            console.warn("Failed to load saved layouts:", e);
            state.savedLayouts = [];
          }
          try {
            if (state.projects) {
              state.projects = state.projects.map((p) => p ? ensureProjectModules(p) : p);
            }
            if (state.activeProject) {
              state.activeProject = ensureProjectModules(state.activeProject);
            }
          } catch (e) {
            console.warn("Failed in onRehydrateStorage migration:", e);
          }
          try {
            if (state.materials) {
              DEFAULT_MATERIALS.forEach((defaultMat) => {
                if (!state.materials.some((m) => m.id === defaultMat.id)) {
                  state.materials.push(defaultMat);
                }
              });
            } else {
              state.materials = DEFAULT_MATERIALS;
            }
          } catch (e) {
            console.warn("Failed to sync materials:", e);
          }
        }
      }
    }
  )
);

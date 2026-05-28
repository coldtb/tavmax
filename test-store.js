const calculateDynamicParts = (type, config) => {
  const { width, height, depth, shelves, drawers, doors, materialId, doorMaterialId } = config;
  const parts = [];
  const edge = '2mm';

  switch (type) {
    case 'custom': {
      const baseHeight = config.hasLegs ? height - 100 : height;
      const insideWidth = width - 36;
      const parts = [];
      
      // Side panels
      parts.push({ id: 'p-c-1', name: 'Их биеийн хажуу хана (Зүүн)', width: depth, height: baseHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      parts.push({ id: 'p-c-2', name: 'Их биеийн хажуу хана (Баруун)', width: depth, height: baseHeight, quantity: 1, materialId, edgeBanding: edge, category: 'Хажуу хана' });
      
      // Top and Bottom
      parts.push({ id: 'p-c-3', name: 'Дээд таг хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      parts.push({ id: 'p-c-4', name: 'Доод суурь хавтан', width: depth, height: insideWidth, quantity: 1, materialId, edgeBanding: '1mm', category: 'Доод тавиур' });
      
      // HDF Backing
      parts.push({ id: 'p-c-back', name: 'Ар тал (ХДФ)', width: width - 6, height: baseHeight - 6, quantity: 1, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' });
      
      // Shelves
      if (shelves > 0) {
        parts.push({ id: 'p-c-shelf', name: 'Дотор тавиур хавтан', width: depth - 20, height: insideWidth - 2, quantity: shelves, materialId, edgeBanding: '1mm', category: 'Дээд тавиур' });
      }

      // Drawers
      if (drawers > 0) {
        parts.push({ id: 'p-c-drawer', name: 'Шургуулганы нүүр', width: baseHeight / drawers - 10, height: width - 10, quantity: drawers, materialId: doorMaterialId, edgeBanding: edge, category: 'Шургуулга' });
      }

      // Doors
      if (doors > 0) {
        const doorWidth = (width - 10) / doors;
        parts.push({ id: 'p-c-door', name: 'Шүүгээний хаалга', width: doorWidth, height: baseHeight - 10, quantity: doors, materialId: doorMaterialId, edgeBanding: edge, category: 'Хаалга' });
      }

      return parts;
    }
    default:
      return [];
  }
};

const simulateUpdate = (currentModule, configUpdates) => {
  const updatedConfig = { ...currentModule.config, ...configUpdates };
  let updatedParts = [];
  if (currentModule.type === 'custom') {
    const carcassParts = calculateDynamicParts(currentModule.type, updatedConfig);
    const manualParts = currentModule.parts.filter(p => p.id.includes('manual') || p.id.startsWith('p-manual-'));
    updatedParts = [...carcassParts, ...manualParts];
  } else {
    updatedParts = calculateDynamicParts(currentModule.type, updatedConfig);
  }
  return {
    ...currentModule,
    config: updatedConfig,
    parts: updatedParts
  };
};

const initialModule = {
  id: 'mod-proj-empty-1',
  name: 'Шинэ төсөл (Хоосон)',
  type: 'custom',
  config: {
    width: 1200,
    height: 850,
    depth: 600,
    shelves: 0,
    drawers: 0,
    doors: 0,
    hasLegs: false,
    handleType: 'none',
    materialId: 'mat-1',
    doorMaterialId: 'mat-1',
    color: '#d7c29e'
  },
  parts: []
};

// Initial population
initialModule.parts = calculateDynamicParts('custom', initialModule.config);

console.log("INITIAL PARTS COUNT:", initialModule.parts.length);

const updatedModule = simulateUpdate(initialModule, { shelves: 3, doors: 2 });
console.log("UPDATED PARTS:", JSON.stringify(updatedModule.parts.map(p => ({ id: p.id, category: p.category, qty: p.quantity, qtyType: typeof p.quantity })), null, 2));

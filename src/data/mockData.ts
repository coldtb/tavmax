export interface Material {
  id: string;
  name: string;
  code: string;
  category: 'MDF' | 'HDF' | 'Plywood' | 'Acrylic' | 'Egger' | 'Kronospan';
  thickness: number; // in mm
  price: number; // in MNT
  stock: number; // in sheets
  supplier: string;
  color: string; // hex
  textureUrl?: string; // or simulated pattern
}

export interface FurnitureConfig {
  width: number; // mm
  height: number; // mm
  depth: number; // mm
  shelves: number;
  drawers: number;
  doors: number;
  hasLegs: boolean;
  handleType: 'modern' | 'minimal' | 'classic' | 'none';
  materialId: string;
  doorMaterialId: string;
  color: string;       // Door / front panel color
  bodyColor?: string;  // Body / carcass color (optional, falls back to material color)
  countertopType?: 'none' | 'stone' | 'wood';
  glassType?: 'none' | 'clear' | 'frosted'; // Glass door option for upper cabinets
  leftDoor?: boolean;
  rightDoor?: boolean;
  doorWidth?: number;
  doorHeight?: number;
  customDoors?: boolean;
  glassLeft?: boolean;
  glassRight?: boolean;
  partitions?: number;
  dividerPositions?: number[];
  tvHasBase?: boolean;
  shelfPositions?: number[];
  hasCooktop?: boolean;
  burnerCount?: 2 | 4;       // Давтан пластикийн тоо (2 эсвэл 4)
  burnerSize?: number;       // Давтан пластикийн радиус мм-ээр (20–80)
  doorStyle?: 'flat' | 'classic'; // Хаалганы загвар (хавтгай эсвэл сонгодог/хээтэй)
  countertopThickness?: 25 | 40; // Тавцангийн зузаан (2.5см эсвэл 4.0см)
  cooktopWidth?: number;     // Плиткний өргөн (мм-ээр)
  cooktopDepth?: number;     // Плиткний урт/гүн (мм-ээр)
  cooktopXOffset?: number;   // Плиткний X тэнхлэгийн оффсет (мм-ээр)
  cooktopZOffset?: number;   // Плиткний Z тэнхлэгийн оффсет (мм-ээр)
}

export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  materialId: string;
  edgeBanding: 'none' | '1mm' | '2mm' | 'all-sides';
  category: 'Хажуу хана' | 'Дээд тавиур' | 'Доод тавиур' | 'Хаалга' | 'Шургуулга' | 'Ар тал' | 'Хуваалт' | 'Фурнитур';
  notes?: string;
  xOffset?: number;
  yOffset?: number;
  zOffset?: number;
}

export interface CabinetModule {
  id: string;
  name: string;
  type: 'wardrobe' | 'kitchen_lower' | 'kitchen_upper' | 'bookshelf' | 'tv_unit' | 'cabinet' | 'office_desk' | 'bed' | 'vanity' | 'fridge' | 'cooktop' | 'hood' | 'built_in_hood' | 'vitrine' | 'microwave' | 'sink' | 'corner_lower' | 'corner_upper' | 'oven' | 'dishwasher' | 'custom';
  config: FurnitureConfig;
  parts: Part[];
  xOffset: number;
  yOffset: number;
  zOffset: number;
  rotation?: number; // Y-axis rotation in radians (e.g. Math.PI/2 for side wall)
}


export interface Project {
  id: string;
  name: string;
  furnitureType: 'wardrobe' | 'kitchen_lower' | 'kitchen_upper' | 'bookshelf' | 'tv_unit' | 'cabinet' | 'office_desk' | 'bed' | 'vanity' | 'fridge' | 'cooktop' | 'hood' | 'built_in_hood' | 'vitrine' | 'microwave' | 'sink' | 'corner_lower' | 'corner_upper' | 'custom';
  config: FurnitureConfig;
  parts: Part[];
  modules?: CabinetModule[];
  createdAt: string;
  updatedAt: string;
  status: 'шинэ' | 'үйлдвэрлэж байна' | 'зүсэж байна' | 'угсарч байна' | 'хүргэлтэнд' | 'дууссан';
  customerName: string;
  customerPhone: string;
  price: number;
}

export const DEFAULT_MATERIALS: Material[] = [
  { id: 'mat-1', name: 'Egger Цайвар Царс', code: 'H3303-ST10', category: 'Egger', thickness: 18, price: 185000, stock: 120, supplier: 'Евро Декор ХХК', color: '#d7c29e' },
  { id: 'mat-2', name: 'Egger Хүрэн Самар', code: 'H3734-ST9', category: 'Egger', thickness: 18, price: 198000, stock: 85, supplier: 'Евро Декор ХХК', color: '#5c4033' },
  { id: 'mat-3', name: 'Kronospan Гялалзсан Цагаан', code: 'AL01-PS', category: 'Kronospan', thickness: 18, price: 145000, stock: 350, supplier: 'Вүүд Хаус ХХК', color: '#faf9f6' },
  { id: 'mat-4', name: 'Матт Хар Акрил', code: 'AC-09', category: 'Acrylic', thickness: 18, price: 230000, stock: 64, supplier: 'Акрил Монголиа', color: '#1a1a1a' },
  { id: 'mat-5', name: 'Хусны Фанер (Plywood)', code: 'PL-18', category: 'Plywood', thickness: 18, price: 165000, stock: 150, supplier: 'Орос Фанер ХХК', color: '#e6c280' },
  { id: 'mat-6', name: 'Цагаан MDF (Зөөлөн)', code: 'MDF-16', category: 'MDF', thickness: 16, price: 110000, stock: 210, supplier: 'Вүүд Хаус ХХК', color: '#eeeeee' },
  { id: 'mat-7', name: 'ХДФ Ар тал (HDF White)', code: 'HDF-03', category: 'HDF', thickness: 3, price: 35000, stock: 400, supplier: 'Вүүд Хаус ХХК', color: '#f5f5f5' },
  { id: 'mat-8', name: 'Шилэн хавтан (Тунгалаг, 8мм)', code: 'GL-08', category: 'Acrylic', thickness: 8, price: 95000, stock: 180, supplier: 'Шилэн Хийц ХХК', color: '#cce8f0' },
  { id: 'mat-9', name: 'МДФ Сонгодог хаалганы хавтан (18мм)', code: 'MDF-CL-18', category: 'MDF', thickness: 18, price: 215000, stock: 90, supplier: 'Вүүд Хаус ХХК', color: '#e2e8f0' },
  { id: 'mat-ct-wood', name: 'Модон тавцан (Бор судалтай)', code: 'CT-WOOD', category: 'Countertop', thickness: 40, price: 280000, stock: 50, supplier: 'Евро Декор ХХК', color: '#d97706' },
  { id: 'mat-ct-stone', name: 'Чулуун тавцан (Хар судалтай цагаан гантиг)', code: 'CT-STONE', category: 'Countertop', thickness: 40, price: 450000, stock: 35, supplier: 'Шунхлай Групп', color: '#fafafa' }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-empty',
    name: 'Шинэ төсөл (Хоосон)',
    furnitureType: 'custom',
    config: {
      width: 1200,
      height: 850,
      depth: 600,
      shelves: 0,
      drawers: 0,
      doors: 0,
      hasLegs: false,
      handleType: 'none',
      materialId: 'mat-3',
      doorMaterialId: 'mat-3',
      color: '#faf9f6'
    },
    parts: [],
    modules: [],
    createdAt: '2026-05-24T12:00:00Z',
    updatedAt: '2026-05-24T12:00:00Z',
    status: 'шинэ',
    customerName: 'Захиалагч',
    customerPhone: '99999999',
    price: 0
  },
  {
    id: 'proj-1',
    name: 'Зочны өрөөний шкаф',
    furnitureType: 'wardrobe',
    config: {
      width: 1800,
      height: 2200,
      depth: 600,
      shelves: 6,
      drawers: 4,
      doors: 3,
      hasLegs: false,
      handleType: 'minimal',
      materialId: 'mat-1',
      doorMaterialId: 'mat-3',
      color: '#d7c29e'
    },
    parts: [
      { id: 'p-1', name: 'Хажуу хана (Зүүн)', width: 600, height: 2200, quantity: 1, materialId: 'mat-1', edgeBanding: '2mm', category: 'Хажуу хана' },
      { id: 'p-2', name: 'Хажуу хана (Баруун)', width: 600, height: 2200, quantity: 1, materialId: 'mat-1', edgeBanding: '2mm', category: 'Хажуу хана' },
      { id: 'p-3', name: 'Дээд таг', width: 600, height: 1764, quantity: 1, materialId: 'mat-1', edgeBanding: '1mm', category: 'Дээд тавиур' },
      { id: 'p-4', name: 'Доод таг', width: 600, height: 1764, quantity: 1, materialId: 'mat-1', edgeBanding: '1mm', category: 'Доод тавиур' },
      { id: 'p-5', name: 'Дотор босоо хуваалт', width: 580, height: 2064, quantity: 2, materialId: 'mat-1', edgeBanding: '1mm', category: 'Хуваалт' },
      { id: 'p-6', name: 'Хэвтээ тавиур', width: 560, height: 574, quantity: 6, materialId: 'mat-1', edgeBanding: '1mm', category: 'Дээд тавиур' },
      { id: 'p-7', name: 'Хаалга', width: 590, height: 2160, quantity: 3, materialId: 'mat-3', edgeBanding: '2mm', category: 'Хаалга' },
      { id: 'p-8', name: 'Ар тал (ХДФ)', width: 890, height: 2180, quantity: 2, materialId: 'mat-7', edgeBanding: 'none', category: 'Ар тал' }
    ],
    createdAt: '2026-05-10T14:30:00Z',
    updatedAt: '2026-05-23T11:20:00Z',
    status: 'угсарч байна',
    customerName: 'Б.Төгсбилэг',
    customerPhone: '99112233',
    price: 1250000
  },
  {
    id: 'proj-2',
    name: 'Модерн гал тогооны доод шүүгээ',
    furnitureType: 'kitchen_lower',
    config: {
      width: 2400,
      height: 850,
      depth: 600,
      shelves: 3,
      drawers: 6,
      doors: 2,
      hasLegs: true,
      handleType: 'modern',
      materialId: 'mat-2',
      doorMaterialId: 'mat-4',
      color: '#5c4033',
      countertopType: 'stone'
    },
    parts: [],
    modules: [
      // ── FRONT WALL (along X axis) ──────────────────────────────────
      {
        id: 'mod-proj-2-1',
        name: 'Зүүн шүүгээ',
        type: 'kitchen_lower' as const,
        config: { width: 800, height: 850, depth: 600, shelves: 1, drawers: 0, doors: 2, hasLegs: true, handleType: 'modern' as const, materialId: 'mat-2', doorMaterialId: 'mat-4', color: '#5c4033', countertopType: 'stone' as const },
        parts: [],
        xOffset: -800, yOffset: 0, zOffset: 0
      },
      {
        id: 'mod-proj-2-2',
        name: 'Плиткэн зуух',
        type: 'cooktop' as const,
        config: { width: 800, height: 850, depth: 600, shelves: 0, drawers: 0, doors: 0, hasLegs: true, handleType: 'none' as const, materialId: 'mat-2', doorMaterialId: 'mat-2', color: '#171717', countertopType: 'stone' as const },
        parts: [],
        xOffset: 0, yOffset: 0, zOffset: 0
      },
      {
        id: 'mod-proj-2-3',
        name: 'Баруун угаалтуур',
        type: 'sink' as const,
        config: { width: 800, height: 850, depth: 600, shelves: 0, drawers: 0, doors: 2, hasLegs: true, handleType: 'modern' as const, materialId: 'mat-2', doorMaterialId: 'mat-4', color: '#5c4033', countertopType: 'stone' as const },
        parts: [],
        xOffset: 800, yOffset: 0, zOffset: 0
      },
      // ── SIDE WALL (along Z axis from left corner, rotated -90° to face room) ──
      {
        id: 'mod-proj-2-7',
        name: 'Хажуугийн шүүгээ 1',
        type: 'kitchen_lower' as const,
        config: { width: 800, height: 850, depth: 600, shelves: 1, drawers: 2, doors: 0, hasLegs: true, handleType: 'modern' as const, materialId: 'mat-2', doorMaterialId: 'mat-4', color: '#5c4033', countertopType: 'stone' as const },
        parts: [],
        xOffset: -900, yOffset: 0, zOffset: 400,
        rotation: -Math.PI / 2
      },
      {
        id: 'mod-proj-2-8',
        name: 'Хажуугийн шүүгээ 2',
        type: 'kitchen_lower' as const,
        config: { width: 800, height: 850, depth: 600, shelves: 0, drawers: 3, doors: 0, hasLegs: true, handleType: 'modern' as const, materialId: 'mat-2', doorMaterialId: 'mat-4', color: '#5c4033', countertopType: 'stone' as const },
        parts: [],
        xOffset: -900, yOffset: 0, zOffset: 1200,
        rotation: -Math.PI / 2
      },
      // ── UPPER CABINETS (above front wall) ──────────────────────────
      {
        id: 'mod-proj-2-4',
        name: 'Зүүн дээд шүүгээ',
        type: 'kitchen_upper' as const,
        config: { width: 800, height: 700, depth: 350, shelves: 2, drawers: 0, doors: 2, hasLegs: false, handleType: 'none' as const, materialId: 'mat-3', doorMaterialId: 'mat-3', color: '#faf9f6' },
        parts: [],
        xOffset: -800, yOffset: 1400, zOffset: 0
      },
      {
        id: 'mod-proj-2-5',
        name: 'Хэншүү сорогч',
        type: 'hood' as const,
        config: { width: 800, height: 700, depth: 500, shelves: 0, drawers: 0, doors: 0, hasLegs: false, handleType: 'none' as const, materialId: 'mat-3', doorMaterialId: 'mat-3', color: '#525252' },
        parts: [],
        xOffset: 0, yOffset: 1400, zOffset: 0
      },
      {
        id: 'mod-proj-2-6',
        name: 'Баруун дээд шүүгээ',
        type: 'kitchen_upper' as const,
        config: { width: 800, height: 700, depth: 350, shelves: 2, drawers: 0, doors: 2, hasLegs: false, handleType: 'none' as const, materialId: 'mat-3', doorMaterialId: 'mat-3', color: '#faf9f6' },
        parts: [],
        xOffset: 800, yOffset: 1400, zOffset: 0
      }
    ],

    createdAt: '2026-05-18T09:15:00Z',
    updatedAt: '2026-05-23T15:40:00Z',
    status: 'зүсэж байна',
    customerName: 'С.Анударь',
    customerPhone: '88087766',
    price: 1890000
  },
  {
    id: 'proj-3',
    name: 'Лофт номын тавиур',
    furnitureType: 'bookshelf',
    config: {
      width: 1200,
      height: 1800,
      depth: 300,
      shelves: 5,
      drawers: 0,
      doors: 0,
      hasLegs: true,
      handleType: 'none',
      materialId: 'mat-5',
      doorMaterialId: 'mat-5',
      color: '#e6c280'
    },
    parts: [
      { id: 'pb-1', name: 'Хажуу босоо хавтан', width: 300, height: 1750, quantity: 2, materialId: 'mat-5', edgeBanding: '2mm', category: 'Хажуу хана' },
      { id: 'pb-2', name: 'Тавиур хавтан', width: 290, height: 1164, quantity: 6, materialId: 'mat-5', edgeBanding: '2mm', category: 'Дээд тавиур' }
    ],
    createdAt: '2026-05-22T10:00:00Z',
    updatedAt: '2026-05-22T10:30:00Z',
    status: 'шинэ',
    customerName: 'Т.Эрдэнэ',
    customerPhone: '95153545',
    price: 640000
  },
  {
    id: 'proj-tv',
    name: 'Зочны өрөөний ТВ тавиур (Зурагттай)',
    furnitureType: 'cabinet',
    config: {
      width: 1800,
      height: 450,
      depth: 450,
      shelves: 0,
      drawers: 0,
      doors: 3,
      hasLegs: true,
      handleType: 'minimal',
      materialId: 'mat-1',
      doorMaterialId: 'mat-3',
      color: '#faf9f6'
    },
    parts: [],
    modules: [
      {
        id: 'mod-tv-cabinet',
        name: 'ТВ тавиур (Доод шүүгээ)',
        type: 'cabinet' as const,
        config: {
          width: 1800,
          height: 450,
          depth: 450,
          shelves: 0,
          drawers: 0,
          doors: 3,
          hasLegs: true,
          handleType: 'minimal' as const,
          materialId: 'mat-1',
          doorMaterialId: 'mat-3',
          color: '#faf9f6',
          partitions: 2,
          dividerPositions: [600, 1200]
        },
        parts: [],
        xOffset: 0,
        yOffset: 0,
        zOffset: 0
      },
      {
        id: 'mod-tv-screen',
        name: 'ТВ Зурагт (55" TV)',
        type: 'tv_unit' as const,
        config: {
          width: 1200,
          height: 700,
          depth: 80,
          shelves: 0,
          drawers: 0,
          doors: 0,
          hasLegs: false,
          handleType: 'none' as const,
          materialId: 'mat-4',
          doorMaterialId: 'mat-4',
          color: '#1a1a1a',
          tvHasBase: false
        },
        parts: [],
        xOffset: 0,
        yOffset: 600,
        zOffset: 0
      }
    ],
    createdAt: '2026-05-27T12:00:00Z',
    updatedAt: '2026-05-27T12:00:00Z',
    status: 'шинэ',
    customerName: 'Захиалагч',
    customerPhone: '99009900',
    price: 1150000
  }
];

export const MOCK_FACTORY_QUEUE = [
  { id: 'o-1', projectName: 'Зочны өрөөний шкаф', worker: 'Б.Батболд', stage: 'угсарч байна', updatedAt: '2026-05-23T11:00:00Z' },
  { id: 'o-2', projectName: 'Гал тогооны шүүгээ', worker: 'Г.Лхагва', stage: 'зүсэж байна', updatedAt: '2026-05-23T10:30:00Z' },
  { id: 'o-3', projectName: 'Номын тавиур', worker: 'Ариунболд', stage: 'шинэ', updatedAt: '2026-05-23T09:00:00Z' }
];

export const MOCK_CHAT_HISTORY = [
  { sender: 'factory', text: 'Сайн байна уу? Таны захиалсан шкафны бэлдэц бэлэн болж, угсралтын шатанд шилжлээ.', time: '11:00' },
  { sender: 'customer', text: 'Маш сайн байна, баярлалаа! Өнгө нь цайвар царсаараа байгаа биз дээ?', time: '11:15' },
  { sender: 'factory', text: 'Тийм ээ, их бие нь Egger Цайвар Царс, хаалга нь Гялалзсан Цагаан өнгөтэй байгаа.', time: '11:20' }
];

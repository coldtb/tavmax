import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Project, Material } from '../data/mockData';
import { useProjectStore, getCabinetSections, getCabinetFrontPanels } from '../store/projectStore';
import { Box } from 'lucide-react';


export interface ThreeViewerRef {
  get3DPoint: (clientX: number, clientY: number) => { x: number, y: number, z: number } | null;
}

export interface ThreeViewerProps {
  project: Project;
  materials: Material[];
  explode: boolean;     // Explode view state
  showDimensions: boolean; // Show dimensions overlay
  openDoors: boolean;    // Open doors state
  viewMode: 'perspective' | 'front' | 'top' | 'side';
  enableSnapping?: boolean;
  measureMode?: boolean; // A-B measurement mode
  paintMaterialId?: string | null;
  onPaintComponent?: (moduleId: string, type: 'materialId' | 'doorMaterialId', materialId: string) => void;
  onRightClickModule?: (moduleId: string, clientX: number, clientY: number) => void;
  onDoubleClickModule?: (moduleId: string) => void;
  showRoom?: boolean;
  roomWallColor?: string;
  roomFloorType?: 'wood' | 'tile' | 'marble' | 'concrete';
  roomWidth?: number;  // mm
  roomDepth?: number;  // mm
  roomHeight?: number; // mm
}

const getShelfY = (
  i: number,
  numShelves: number,
  insideHeight: number,
  legHeight: number,
  config: any,
  baseOffset: number = 18
): number => {
  if (config.shelfPositions && config.shelfPositions.length === numShelves) {
    return legHeight + baseOffset + config.shelfPositions[i];
  }
  const step = insideHeight / (numShelves + 1);
  return legHeight + baseOffset + (i + 1) * step;
}

let cachedWoodTex: THREE.CanvasTexture | null = null;
let cachedMarbleTex: THREE.CanvasTexture | null = null;

const createWoodTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // White base for perfect tinting
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);
  
  // Draw organic wood grain lines (Vertical)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = 2.0;
  
  for (let i = 0; i < 70; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    ctx.moveTo(startX, 0);
    
    let currentX = startX;
    for (let y = 10; y <= 512; y += 10) {
      currentX += Math.sin(y * 0.04 + startX) * 0.9 + (Math.random() - 0.5) * 0.6;
      ctx.lineTo(currentX, y);
    }
    ctx.stroke();
  }
  
  // Fine noise fibers (Vertical)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let i = 0; i < 6000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 1, Math.random() * 15 + 5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

const createMarbleTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  
  // Clean off-white base
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Draw dark grey/black marble veins
  const drawVein = (startX: number, startY: number, length: number, angle: number, depth: number) => {
    if (depth > 4) return;
    ctx.strokeStyle = `rgba(35, 35, 40, ${0.15 + Math.random() * 0.3})`;
    ctx.lineWidth = Math.max(0.6, 4.0 - depth * 0.8);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    let curX = startX;
    let curY = startY;
    const segments = 22;
    const segLen = length / segments;
    
    for (let i = 0; i < segments; i++) {
      angle += (Math.random() - 0.5) * 0.45;
      curX += Math.cos(angle) * segLen;
      curY += Math.sin(angle) * segLen;
      ctx.lineTo(curX, curY);
      
      if (Math.random() < 0.14) {
        drawVein(curX, curY, length * 0.55, angle + (Math.random() > 0.5 ? 0.75 : -0.75), depth + 1);
      }
    }
    ctx.stroke();
  };
  
  // Draw 10 main veins
  for (let i = 0; i < 10; i++) {
    const sx = Math.random() * 1024;
    const sy = Math.random() * 1024;
    const angle = Math.random() * Math.PI * 2;
    drawVein(sx, sy, 350 + Math.random() * 350, angle, 0);
  }
  
  // Grey soft clouds/shadows
  for (let i = 0; i < 7; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 1024;
    const r = 250 + Math.random() * 250;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(110, 110, 115, 0.05)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const getWoodTexture = () => {
  if (!cachedWoodTex) {
    cachedWoodTex = createWoodTexture();
  }
  return cachedWoodTex;
};

const getMarbleTexture = () => {
  if (!cachedMarbleTex) {
    cachedMarbleTex = createMarbleTexture();
  }
  return cachedMarbleTex;
};

export const ThreeViewer = React.forwardRef<ThreeViewerRef, ThreeViewerProps>(({
  project,
  materials,
  explode,
  showDimensions,
  openDoors,
  viewMode,
  enableSnapping = true,
  measureMode = false,
  onRightClickModule,
  onDoubleClickModule,
  showRoom = false,
  roomWallColor = '#f5f0eb',
  roomFloorType = 'wood',
  roomWidth = 4000,
  roomDepth = 3000,
  roomHeight = 2700,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const dimsGroupRef = useRef<THREE.Group | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);

  const projectRef = useRef(project);
  const enableSnappingRef = useRef(enableSnapping);
  const explodeRef = useRef(explode);
  const openDoorsRef = useRef(openDoors);
  const roomWidthRef = useRef(roomWidth);
  const roomDepthRef = useRef(roomDepth);
  const showRoomRef = useRef(showRoom);

  useEffect(() => {
    roomWidthRef.current = roomWidth;
  }, [roomWidth]);

  useEffect(() => {
    roomDepthRef.current = roomDepth;
  }, [roomDepth]);

  useEffect(() => {
    showRoomRef.current = showRoom;
  }, [showRoom]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    enableSnappingRef.current = enableSnapping;
  }, [enableSnapping]);

  useEffect(() => {
    explodeRef.current = explode;
  }, [explode]);

  useEffect(() => {
    console.log("ThreeViewer: openDoors changed to", openDoors);
    openDoorsRef.current = openDoors;
  }, [openDoors]);

  useImperativeHandle(ref, () => ({
    get3DPoint: (clientX: number, clientY: number) => {
      if (!rendererRef.current || !cameraRef.current) return null;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, point);
      
      return { x: point.x, y: point.y, z: point.z };
    }
  }));

  const selectedModuleId = useProjectStore((s) => s.selectedModuleId);
  const updateModulePosition = useProjectStore((s) => s.updateModulePosition);
  const setSelectedModuleId = useProjectStore((s) => s.setSelectedModuleId);
  const updateActiveConfig = useProjectStore((s) => s.updateActiveConfig);

  // React state to capture and display engine runtime crashes
  const [engineError, setEngineError] = useState<string | null>(null);

  // A-B Measurement state
  const [measurePoints, setMeasurePoints] = useState<{ a: THREE.Vector3 | null; b: THREE.Vector3 | null }>({
    a: null,
    b: null,
  });
  const measurePointsRef = useRef<{ a: THREE.Vector3 | null; b: THREE.Vector3 | null }>({
    a: null,
    b: null,
  });
  const measureLineRef = useRef<THREE.Line | null>(null);
  const measureSphereARef = useRef<THREE.Mesh | null>(null);
  const measureSphereBRef = useRef<THREE.Mesh | null>(null);
  const measureModeRef = useRef(measureMode);

  useEffect(() => {
    measureModeRef.current = measureMode;
    // Update cursor on the canvas element
    if (rendererRef.current?.domElement) {
      rendererRef.current.domElement.style.cursor = measureMode ? 'crosshair' : 'default';
    }
    // When measure mode is turned off, clear points
    if (!measureMode) {
      measurePointsRef.current = { a: null, b: null };
      setMeasurePoints({ a: null, b: null });
      // Remove measure line and spheres from scene
      if (measureLineRef.current && sceneRef.current) {
        sceneRef.current.remove(measureLineRef.current);
        measureLineRef.current = null;
      }
      if (measureSphereARef.current && sceneRef.current) {
        sceneRef.current.remove(measureSphereARef.current);
        measureSphereARef.current = null;
      }
      if (measureSphereBRef.current && sceneRef.current) {
        sceneRef.current.remove(measureSphereBRef.current);
        measureSphereBRef.current = null;
      }
    }
  }, [measureMode]);

  // Track values for animation interpolation (lerp)
  const animState = useRef({
    explodeFactor: 0,
    doorOpenFactor: 0,
  });

  const updateDimensionLabels = (labelsContainer: HTMLDivElement) => {
    if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
    const selectedMod = projectRef.current.modules?.find(m => m.id === selectedModuleId);
    if (!showDimensions || !selectedModuleId || !selectedMod) {
      labelsContainer.innerHTML = '';
      return;
    }

    cameraRef.current.updateMatrixWorld(true);

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const config = selectedMod.config;
    const width = Number(config.width) || 0;
    const height = Number(config.height) || 0;
    const depth = Number(config.depth) || 0;
    const hasLegs = !!config.hasLegs;
    const legHeight = hasLegs ? 100 : 0;
    const bodyHeight = height - legHeight;
    const insideHeight = bodyHeight - 36;
    const shelves = Number(config.shelves) || 0;
    const drawers = Number(config.drawers) || 0;

    const mx = selectedMod.xOffset;
    const my = selectedMod.yOffset;
    const mz = selectedMod.zOffset;
    const rotationY = selectedMod.rotation || 0;

    const localToWorld = (lx: number, ly: number, lz: number) => {
      const rx = lx * Math.cos(rotationY) + lz * Math.sin(rotationY);
      const rz = -lx * Math.sin(rotationY) + lz * Math.cos(rotationY);
      return new THREE.Vector3(rx + mx, ly + my, rz + mz);
    };

    const labels: { text: string; pos3d: THREE.Vector3; styleClass?: string }[] = [];

    // 1. Outer Dimensions (Amber/Orange)
    labels.push({
      text: `${width}мм`,
      pos3d: localToWorld(0, legHeight - 50, depth / 2 + 50),
      styleClass: 'border-amber-500/30 text-amber-400 bg-[#12141c]/95'
    });
    labels.push({
      text: `${height}мм`,
      pos3d: localToWorld(-width / 2 - 50, height / 2, depth / 2 + 50),
      styleClass: 'border-amber-500/30 text-amber-400 bg-[#12141c]/95'
    });
    labels.push({
      text: `${depth}мм`,
      pos3d: localToWorld(-width / 2 - 50, legHeight - 50, 0),
      styleClass: 'border-amber-500/30 text-amber-400 bg-[#12141c]/95'
    });

    // 2. Legs (if enabled)
    if (hasLegs) {
      labels.push({
        text: `Хөл: ${legHeight}мм`,
        pos3d: localToWorld(-width / 2 + 40, legHeight / 2, depth / 2 - 40),
        styleClass: 'border-yellow-500/20 text-yellow-400 bg-[#12141c]/90'
      });
    }

    // 3. Section widths (if partitions > 0)
    const sections = getCabinetSections(width, config, selectedMod.type);
    const partitions = sections.length - 1;
    if (partitions > 0) {
      sections.forEach((sec, sIdx) => {
        labels.push({
          text: `Секц ${sIdx + 1}: ${Math.round(sec.width)}мм`,
          pos3d: localToWorld(sec.centerX, legHeight + 36, depth / 2 - 40),
          styleClass: 'border-emerald-500/20 text-emerald-400 bg-[#12141c]/90'
        });
      });
    }

    // 4. Shelves spacing
    if (shelves > 0) {
      if (partitions > 0) {
        let shelfIdx = 0;
        const storedSecCounts: number[] | undefined = (config as any).sectionShelfCounts;
        const hasValidSecCounts = storedSecCounts && storedSecCounts.length === sections.length && storedSecCounts.reduce((a: number, b: number) => a + b, 0) === shelves;
        sections.forEach((sec, sIdx) => {
          const shelvesInSec = hasValidSecCounts ? storedSecCounts![sIdx] : (Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0));
          if (shelvesInSec > 0) {
            const getSectionShelfCenterY = (secShelfOffsetIdx: number) => {
              const globalIdx = shelfIdx + secShelfOffsetIdx;
              if (config.shelfPositions && config.shelfPositions.length === shelves) {
                const secPositions = [];
                for (let j = 0; j < shelvesInSec; j++) {
                  secPositions.push(config.shelfPositions[shelfIdx + j]);
                }
                secPositions.sort((a, b) => a - b);
                return legHeight + 18 + secPositions[secShelfOffsetIdx];
              } else {
                const step = insideHeight / (shelvesInSec + 1);
                return legHeight + 18 + (secShelfOffsetIdx + 1) * step;
              }
            };

            for (let i = 0; i <= shelvesInSec; i++) {
              let startY: number;
              let endY: number;
              if (i === 0) {
                startY = legHeight + 18;
                endY = getSectionShelfCenterY(0) - 9;
              } else if (i === shelvesInSec) {
                startY = getSectionShelfCenterY(shelvesInSec - 1) + 9;
                endY = legHeight + 18 + insideHeight;
              } else {
                startY = getSectionShelfCenterY(i - 1) + 9;
                endY = getSectionShelfCenterY(i) - 9;
              }
              const gapH = Math.round(endY - startY);
              labels.push({
                text: `${gapH}мм`,
                pos3d: localToWorld(sec.centerX, (startY + endY) / 2, 0),
                styleClass: 'border-blue-500/20 text-blue-300 bg-[#12141c]/90'
              });
            }
            shelfIdx += shelvesInSec;
          }
        });
      } else {
        const sortedY = [...(config.shelfPositions || [])].sort((a, b) => a - b);
        const getShelfCenterY = (idx: number) => {
          if (sortedY.length === shelves) {
            return legHeight + 18 + sortedY[idx];
          } else {
            const step = insideHeight / (shelves + 1);
            return legHeight + 18 + (idx + 1) * step;
          }
        };

        for (let i = 0; i <= shelves; i++) {
          let startY: number;
          let endY: number;
          if (i === 0) {
            startY = legHeight + 18;
            endY = getShelfCenterY(0) - 9;
          } else if (i === shelves) {
            startY = getShelfCenterY(shelves - 1) + 9;
            endY = legHeight + 18 + insideHeight;
          } else {
            startY = getShelfCenterY(i - 1) + 9;
            endY = getShelfCenterY(i) - 9;
          }
          const gapH = Math.round(endY - startY);
          labels.push({
            text: `${gapH}мм`,
            pos3d: localToWorld(0, (startY + endY) / 2, 0),
            styleClass: 'border-blue-500/20 text-blue-300 bg-[#12141c]/90'
          });
        }
      }
    }

    // 5. Drawers (if any)
    if (drawers > 0) {
      const drawerSecIdx = partitions > 0 ? sections.length - 1 : 0;
      const sec = sections[drawerSecIdx];
      const drH = (bodyHeight - 10) / drawers;
      for (let i = 0; i < drawers; i++) {
        labels.push({
          text: `Шургуулга: ${Math.round(drH - 6)}мм`,
          pos3d: localToWorld(sec.centerX, legHeight + 5 + i * drH + drH / 2, depth / 2 + 10),
          styleClass: 'border-purple-500/20 text-purple-300 bg-[#12141c]/90'
        });
      }
    }

    // Project and render
    let html = '';
    labels.forEach(lbl => {
      const tempV = lbl.pos3d.clone().project(cameraRef.current!);
      if (tempV.z <= 1) {
        const x = (tempV.x * 0.5 + 0.5) * rect.width;
        const y = (-tempV.y * 0.5 + 0.5) * rect.height;
        
        // Hide if coordinates are out of bounds of visualizer canvas
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          html += `
            <div class="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[9px] font-black bg-[#12141c]/90 border border-white/10 shadow-lg pointer-events-none whitespace-nowrap ${lbl.styleClass || ''}"
                 style="left: ${x}px; top: ${y}px;">
              ${lbl.text}
            </div>
          `;
        }
      }
    });
    labelsContainer.innerHTML = html;
  };

  const updateDimensionLabelsRef = useRef(updateDimensionLabels);
  useEffect(() => {
    updateDimensionLabelsRef.current = updateDimensionLabels;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    let animId: number = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let lastScreenshotTime = 0;

    // Drag-and-drop state variables
    let isDragging = false;
    let draggedGroup: THREE.Group | null = null;
    const dragPlane = new THREE.Plane();
    const dragIntersection = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Shelf drag-and-drop state variables
    let isDraggingShelf = false;
    let draggedShelfMesh: THREE.Mesh | null = null;
    let parentModuleGroup: THREE.Group | null = null;
    let draggedShelfIndex = -1;

    // Partition drag-and-drop state variables
    let isDraggingPartition = false;
    let draggedPartitionMesh: THREE.Mesh | null = null;
    let draggedPartitionIndex = -1;

    // Drag threshold variables
    let dragStartX = 0;
    let dragStartY = 0;
    let dragThresholdPassed = false;
    let activeDragType: 'module' | 'shelf' | 'partition' | null = null;
    let clickedEmpty = false;

    try {
      // 1. Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#23272b'); // Dark studio neutral
      scene.fog = new THREE.FogExp2('#23272b', 0.00003); // Soft depth fog
      sceneRef.current = scene;

      // Bounding groups (Initialized early to prevent ReferenceError)
      const furnitureGroup = new THREE.Group();
      scene.add(furnitureGroup);
      furnitureGroupRef.current = furnitureGroup;

      const dimsGroup = new THREE.Group();
      scene.add(dimsGroup);
      dimsGroupRef.current = dimsGroup;

      // Add balanced studio lighting
      scene.add(new THREE.AmbientLight('#d0d8e0', 0.7));

      const mainLight = new THREE.DirectionalLight('#fff4e8', 1.0);
      mainLight.position.set(1500, 2500, 1500);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.bias = -0.0005;
      scene.add(mainLight);

      const fillLight = new THREE.DirectionalLight('#c8d8f0', 0.4); // cool blue fill
      fillLight.position.set(-1500, 1000, -1000);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight('#ffe0b0', 0.25); // warm rim
      rimLight.position.set(0, -800, 1500);
      scene.add(rimLight);

      // 2. Camera Setup
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight || 500;
      const camera = new THREE.PerspectiveCamera(45, width / height, 50, 25000);
      camera.position.set(2200, 1800, 3200);
      cameraRef.current = camera;

      // 3. Renderer Setup
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. Orbit Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 + 0.1; // allow looking slightly underneath
      controls.minDistance = 300;
      controls.maxDistance = 12000;
      controls.zoomToCursor = true; // Scroll zooms toward cursor position
      
      // Load saved camera and target state if available to prevent view jumping on mounting
      const savedCam = sessionStorage.getItem('tavmax-camera-pos');
      if (savedCam) {
        try {
          const { x, y, z, tx, ty, tz } = JSON.parse(savedCam);
          camera.position.set(x, y, z);
          controls.target.set(tx, ty, tz);
        } catch (e) {
          camera.position.set(2200, 1800, 3200);
          controls.target.set(0, project.config.height / 2, 0);
        }
      } else {
        camera.position.set(2200, 1800, 3200);
        controls.target.set(0, project.config.height / 2, 0);
      }
      controlsRef.current = controls;

      // Save camera position and target on user rotation/pan
      controls.addEventListener('change', () => {
        if (cameraRef.current && controlsRef.current) {
          sessionStorage.setItem('tavmax-camera-pos', JSON.stringify({
            x: cameraRef.current.position.x,
            y: cameraRef.current.position.y,
            z: cameraRef.current.position.z,
            tx: controlsRef.current.target.x,
            ty: controlsRef.current.target.y,
            tz: controlsRef.current.target.z
          }));
        }
      });

      // Custom Pointer Drag Handlers (XZ Ground Plane projection)
      // Track which measurement sphere is being dragged
      let measureDragging: 'a' | 'b' | null = null;
      const measureHitPlane = new THREE.Plane(); // reusable plane for measure dragging
      const measureHitPoint = new THREE.Vector3();

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return; // Only allow left-clicks for dragging / select
        if (!rendererRef.current || !cameraRef.current || !controlsRef.current) return;

        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, cameraRef.current);

        // ── MEASURE MODE: drag existing sphere or place new point ──
        if (measureModeRef.current) {
          const pts = measurePointsRef.current;

          // --- Check if clicking near an existing sphere to DRAG it ---
          const spheresToCheck: Array<{ which: 'a' | 'b'; sphere: THREE.Mesh }> = [];
          if (pts.a && measureSphereARef.current) spheresToCheck.push({ which: 'a', sphere: measureSphereARef.current });
          if (pts.b && measureSphereBRef.current) spheresToCheck.push({ which: 'b', sphere: measureSphereBRef.current });

          for (const { which, sphere } of spheresToCheck) {
            const sphIntersects = raycaster.intersectObject(sphere, false);
            // Also check proximity in screen space
            const sphScreenPos = sphere.position.clone().project(cameraRef.current!);
            const sphPixX = (sphScreenPos.x * 0.5 + 0.5) * rect.width;
            const sphPixY = (-sphScreenPos.y * 0.5 + 0.5) * rect.height;
            const dist2D = Math.hypot(event.clientX - rect.left - sphPixX, event.clientY - rect.top - sphPixY);

            if (sphIntersects.length > 0 || dist2D < 18) {
              // Start dragging this sphere
              measureDragging = which;
              controlsRef.current!.enabled = false; // freeze camera while dragging
              // Set drag plane parallel to camera view at sphere's position
              const camDir = new THREE.Vector3();
              cameraRef.current!.getWorldDirection(camDir);
              measureHitPlane.setFromNormalAndCoplanarPoint(camDir, sphere.position);
              return;
            }
          }

          // --- No sphere hit: place new point ---
          const allObjects: THREE.Object3D[] = [];
          furnitureGroup.traverse((o) => { if (o instanceof THREE.Mesh) allObjects.push(o); });
          const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          const groundHit = new THREE.Vector3();
          raycaster.ray.intersectPlane(groundPlane, groundHit);

          const intersects = raycaster.intersectObjects(allObjects, false);
          let hitPoint: THREE.Vector3;
          if (intersects.length > 0) {
            hitPoint = intersects[0].point.clone();
          } else {
            hitPoint = groundHit;
          }

          if (!pts.a || (pts.a && pts.b)) {
            // Set point A (first click OR both already set → start fresh)
            measurePointsRef.current = { a: hitPoint, b: null };
            setMeasurePoints({ a: hitPoint, b: null });

            // Remove old B sphere
            if (measureSphereBRef.current) { scene.remove(measureSphereBRef.current); measureSphereBRef.current = null; }
            // Remove old line
            if (measureLineRef.current) { scene.remove(measureLineRef.current); measureLineRef.current = null; }

            // Place A sphere
            if (measureSphereARef.current) scene.remove(measureSphereARef.current);
            const sphA = new THREE.Mesh(
              new THREE.SphereGeometry(12, 16, 16),
              new THREE.MeshBasicMaterial({ color: '#10b981', depthTest: false })
            );
            sphA.position.copy(hitPoint);
            sphA.renderOrder = 999;
            scene.add(sphA);
            measureSphereARef.current = sphA;
          } else {
            // Set point B
            measurePointsRef.current = { a: pts.a, b: hitPoint };
            setMeasurePoints({ a: pts.a, b: hitPoint });

            // Place B sphere
            if (measureSphereBRef.current) scene.remove(measureSphereBRef.current);
            const sphB = new THREE.Mesh(
              new THREE.SphereGeometry(12, 16, 16),
              new THREE.MeshBasicMaterial({ color: '#f59e0b', depthTest: false })
            );
            sphB.position.copy(hitPoint);
            sphB.renderOrder = 999;
            scene.add(sphB);
            measureSphereBRef.current = sphB;

            // Draw line A→B
            if (measureLineRef.current) scene.remove(measureLineRef.current);
            const lineGeo = new THREE.BufferGeometry().setFromPoints([pts.a, hitPoint]);
            const lineMat = new THREE.LineDashedMaterial({
              color: '#f59e0b',
              linewidth: 2,
              dashSize: 30,
              gapSize: 15,
              depthTest: false,
            });
            const measureLine = new THREE.Line(lineGeo, lineMat);
            measureLine.computeLineDistances();
            measureLine.renderOrder = 998;
            scene.add(measureLine);
            measureLineRef.current = measureLine;
          }
          return; // Don't process drag in measure mode
        }

        // ── NORMAL DRAG MODE ──
        const intersects = raycaster.intersectObjects(furnitureGroup.children, true);
        if (intersects.length > 0) {
          const hitObj = intersects[0].object;

          // Trace up to find parent group
          let obj: THREE.Object3D | null = hitObj;
          let group: THREE.Group | null = null;
          while (obj && obj !== scene) {
            if (obj.parent === furnitureGroup) {
              group = obj as THREE.Group;
              break;
            }
            obj = obj.parent;
          }

          dragStartX = event.clientX;
          dragStartY = event.clientY;
          dragThresholdPassed = false;

          // Check if we hit an interior shelf to drag it vertically
          if (hitObj.userData.category === 'Дээд тавиур' && hitObj.userData.shelfIndex !== undefined && hitObj instanceof THREE.Mesh) {
            activeDragType = 'shelf';
            draggedShelfMesh = hitObj;
            draggedShelfIndex = hitObj.userData.shelfIndex;
            parentModuleGroup = group;

            if (group) {
              setSelectedModuleId(group.name); // Select this module in store
              // Glow shelf drag effect (warm amber/yellow glow)
              if (hitObj.material && !Array.isArray(hitObj.material)) {
                const mat = hitObj.material as any;
                if (mat.emissive) {
                  mat.emissive.setHex(0x3f320b); // warm amber glow
                }
              }

              // Set drag projection plane perpendicular to camera direction facing the shelf
              const camDir = new THREE.Vector3();
              cameraRef.current.getWorldDirection(camDir);
              const planeNormal = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
              const worldPos = new THREE.Vector3();
              hitObj.getWorldPosition(worldPos);
              dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldPos);
            }
          }
          // Check if we hit a vertical partition to drag it horizontally
          else if (hitObj.userData.category === 'Хуваалт' && hitObj.userData.partitionIndex !== undefined && hitObj instanceof THREE.Mesh) {
            activeDragType = 'partition';
            draggedPartitionMesh = hitObj;
            draggedPartitionIndex = hitObj.userData.partitionIndex;
            parentModuleGroup = group;

            if (group) {
              setSelectedModuleId(group.name); // Select this module in store
              // Glow partition drag effect (warm amber/yellow glow)
              if (hitObj.material && !Array.isArray(hitObj.material)) {
                const mat = hitObj.material as any;
                if (mat.emissive) {
                  mat.emissive.setHex(0x3f320b); // warm amber glow
                }
              }

              // Set drag projection plane perpendicular to camera direction facing the front
              const camDir = new THREE.Vector3();
              cameraRef.current.getWorldDirection(camDir);
              const planeNormal = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
              const worldPos = new THREE.Vector3();
              hitObj.getWorldPosition(worldPos);
              dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldPos);
            }
          }
          // Otherwise drag the entire module
          else if (group && group.name) {
            activeDragType = 'module';
            draggedGroup = group;
            setSelectedModuleId(group.name); // Select this module in store

            // Glow drag effect
            group.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material && !Array.isArray(child.material)) {
                const mat = child.material as any;
                if (mat.emissive) {
                  mat.emissive.setHex(0x1e3a8a); // blue glow
                }
              }
            });

            // Set drag projection plane parallel to ground at group's current Y position
            const worldPos = new THREE.Vector3();
            group.getWorldPosition(worldPos);
            dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), worldPos);

            if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
              dragOffset.copy(group.position).sub(dragIntersection);
            }
          }
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!rendererRef.current || !cameraRef.current) return;

        // --- CHECK DRAG THRESHOLD ---
        if (activeDragType && !dragThresholdPassed) {
          const dist = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
          if (dist >= 6) {
            dragThresholdPassed = true;
            if (controlsRef.current) controlsRef.current.enabled = false; // Disable camera orbiting only when dragging starts
            
            if (activeDragType === 'module') {
              isDragging = true;
            } else if (activeDragType === 'shelf') {
              isDraggingShelf = true;
            } else if (activeDragType === 'partition') {
              isDraggingPartition = true;
            }
          } else {
            return; // drag threshold not passed yet
          }
        }

        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // ── MEASURE MODE: drag measurement sphere ──
        if (measureModeRef.current) {
          raycaster.setFromCamera(mouse, cameraRef.current);

          // Update cursor: show grab cursor near spheres
          let nearSphere = false;
          const pts = measurePointsRef.current;
          const spheres = [
            { which: 'a' as const, sphere: measureSphereARef.current },
            { which: 'b' as const, sphere: measureSphereBRef.current },
          ];
          for (const { sphere } of spheres) {
            if (!sphere) continue;
            const sphScreenPos = sphere.position.clone().project(cameraRef.current!);
            const sphPixX = (sphScreenPos.x * 0.5 + 0.5) * rect.width;
            const sphPixY = (-sphScreenPos.y * 0.5 + 0.5) * rect.height;
            const dist2D = Math.hypot(event.clientX - rect.left - sphPixX, event.clientY - rect.top - sphPixY);
            if (dist2D < 18) { nearSphere = true; break; }
          }
          if (rendererRef.current.domElement) {
            rendererRef.current.domElement.style.cursor = measureDragging
              ? 'grabbing'
              : nearSphere ? 'grab' : 'crosshair';
          }

          // If we are dragging a measurement sphere, update its position
          if (measureDragging) {
            if (raycaster.ray.intersectPlane(measureHitPlane, measureHitPoint)) {
              const newPos = measureHitPoint.clone();

              // Also try to snap to surface
              const allObjects: THREE.Object3D[] = [];
              furnitureGroup.traverse((o) => { if (o instanceof THREE.Mesh) allObjects.push(o); });
              const intersects = raycaster.intersectObjects(allObjects, false);
              if (intersects.length > 0) {
                newPos.copy(intersects[0].point);
              }

              if (measureDragging === 'a') {
                measurePointsRef.current = { ...measurePointsRef.current, a: newPos };
                if (measureSphereARef.current) measureSphereARef.current.position.copy(newPos);
              } else {
                measurePointsRef.current = { ...measurePointsRef.current, b: newPos };
                if (measureSphereBRef.current) measureSphereBRef.current.position.copy(newPos);
              }

              // Redraw line if both points exist
              const { a, b } = measurePointsRef.current;
              if (a && b) {
                if (measureLineRef.current) scene.remove(measureLineRef.current);
                const lineGeo = new THREE.BufferGeometry().setFromPoints([a, b]);
                const lineMat = new THREE.LineDashedMaterial({
                  color: '#f59e0b',
                  linewidth: 2,
                  dashSize: 30,
                  gapSize: 15,
                  depthTest: false,
                });
                const measureLine = new THREE.Line(lineGeo, lineMat);
                measureLine.computeLineDistances();
                measureLine.renderOrder = 998;
                scene.add(measureLine);
                measureLineRef.current = measureLine;
              }

              // Trigger React re-render with updated points
              setMeasurePoints({ ...measurePointsRef.current });
            }
          }
          return;
        }

        // ── SHELF DRAG MODE ──
        if (isDraggingShelf && draggedShelfMesh && parentModuleGroup) {
          raycaster.setFromCamera(mouse, cameraRef.current);
          if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
            const currentModuleId = parentModuleGroup.name;
            const activeMod = projectRef.current.modules || [];
            const activeModItem = activeMod.find(m => m.id === currentModuleId);
            if (activeModItem) {
              const config = activeModItem.config;
              const sPositions = config.shelfPositions || [];
              const legHeight = config.hasLegs ? 100 : 0;
              const insideHeight = config.height - legHeight - 36;
              const localShelfIdx = draggedShelfMesh.userData.shelfIndex;

              // Calculate Y position relative to cabinet floor (legHeight + 18)
              let relativeY = dragIntersection.y - parentModuleGroup.position.y - legHeight - 18;

              // Neighbor limits to prevent overlapping
              const minVal = localShelfIdx === 0 ? 50 : (sPositions[localShelfIdx - 1] || 0) + 50;
              const maxVal = localShelfIdx === sPositions.length - 1 ? insideHeight - 50 : (sPositions[localShelfIdx + 1] || insideHeight) - 50;

              const clampedY = Math.max(minVal, Math.min(maxVal, relativeY));

              // Update the 3D mesh Y position visually
              draggedShelfMesh.position.y = legHeight + 18 + clampedY;

              // Update the userData.baseY so that it stays in place during render loop interpolation
              draggedShelfMesh.userData.baseY = legHeight + 18 + clampedY;
            }
          }
          return;
        }

        // ── PARTITION DRAG MODE ──
        if (isDraggingPartition && draggedPartitionMesh && parentModuleGroup) {
          raycaster.setFromCamera(mouse, cameraRef.current);
          if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
            const currentModuleId = parentModuleGroup.name;
            const activeMod = projectRef.current.modules || [];
            const activeModItem = activeMod.find(m => m.id === currentModuleId);
            if (activeModItem) {
              const config = activeModItem.config;
              const width = Number(config.width) || 0;
              const halfW = width / 2;
              const dPositions = config.dividerPositions || [];
              const localPartitionIdx = draggedPartitionMesh.userData.partitionIndex;

              // Calculate X position relative to left outer edge (ranges 0 to width)
              let relativeX = dragIntersection.x - parentModuleGroup.position.x + halfW;

              // Neighbor limits to prevent overlapping
              const minVal = localPartitionIdx === 0 ? 100 : (dPositions[localPartitionIdx - 1] || 0) + 100;
              const maxVal = localPartitionIdx === dPositions.length - 1 ? width - 100 : (dPositions[localPartitionIdx + 1] || width) - 100;

              const clampedX = Math.max(minVal, Math.min(maxVal, relativeX));

              // Update the 3D mesh X position visually
              draggedPartitionMesh.position.x = -halfW + clampedX;

              // Update the userData.baseX so that it stays in place during render loop interpolation
              draggedPartitionMesh.userData.baseX = -halfW + clampedX;
            }
          }
          return;
        }

        // Set cursor to ns-resize when hovering over a draggable shelf, or ew-resize when hovering over a draggable partition
        if (!isDragging && !isDraggingShelf && !isDraggingPartition && !measureModeRef.current) {
          raycaster.setFromCamera(mouse, cameraRef.current);
          const intersects = raycaster.intersectObjects(furnitureGroup.children, true);
          let hoverShelf = false;
          let hoverPartition = false;
          if (intersects.length > 0) {
            const hitObj = intersects[0].object;
            if (hitObj.userData.category === 'Дээд тавиур' && hitObj.userData.shelfIndex !== undefined) {
              hoverShelf = true;
            } else if (hitObj.userData.category === 'Хуваалт' && hitObj.userData.partitionIndex !== undefined) {
              hoverPartition = true;
            }
          }
          if (rendererRef.current?.domElement) {
            if (hoverShelf) {
              rendererRef.current.domElement.style.cursor = 'ns-resize';
            } else if (hoverPartition) {
              rendererRef.current.domElement.style.cursor = 'ew-resize';
            } else {
              rendererRef.current.domElement.style.cursor = 'default';
            }
          }
        }

        // ── NORMAL DRAG MODE ──
        if (!isDragging || !draggedGroup) return;

        raycaster.setFromCamera(mouse, cameraRef.current);
        if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
          const targetPos = dragIntersection.clone().add(dragOffset);
          let targetX = targetPos.x;
          let targetZ = targetPos.z;
          const currentModules = projectRef.current.modules || [];
          const activeModId = draggedGroup.name;
          const activeMod = currentModules.find(m => m.id === activeModId);
          const activeW = activeMod ? activeMod.config.width : 600;
          const activeD = activeMod ? activeMod.config.depth : 600;

          if (enableSnappingRef.current) {
            const SNAP_THRESHOLD = 30; // snap if within 30mm (was 100mm - caused sticky wall issue)
 
            if (activeMod) {
              const activeRot = activeMod.rotation || 0;
              const activeCos = Math.cos(activeRot);
              const activeSin = Math.sin(activeRot);
              const isActiveUpper = (activeMod.type === 'kitchen_upper' || activeMod.type === 'hood' || activeMod.type === 'built_in_hood' || activeMod.type === 'microwave');

              // Local corner helper relative to a center point
              const activeLocals = [
                { x: -activeW / 2, z: -activeD / 2 }, // Back-Left
                { x: activeW / 2, z: -activeD / 2 },  // Back-Right
                { x: activeW / 2, z: activeD / 2 },   // Front-Right
                { x: -activeW / 2, z: activeD / 2 }   // Front-Left
              ];

              const getActiveWorldCorners = (cx: number, cz: number) => {
                return activeLocals.map(lc => ({
                  x: cx + lc.x * activeCos - lc.z * activeSin,
                  z: cz + lc.x * activeSin + lc.z * activeCos
                }));
              };

              // ── A. WALL SNAPPING ──
              // Snap active back/side corners flush to the room walls
              // 1. Z-axis Wall Snapping (Back Wall and Front Wall)
              let activeCorners = getActiveWorldCorners(targetX, targetZ);
              let snapWallDZ = 0;
              let minWallDistZ = Infinity;
              activeCorners.forEach(ac => {
                const backWallZ = -roomDepthRef.current / 2;
                const frontWallZ = roomDepthRef.current / 2;
                const distBack = ac.z - backWallZ;
                const distFront = ac.z - frontWallZ;
                if (Math.abs(distBack) < SNAP_THRESHOLD && Math.abs(distBack) < Math.abs(minWallDistZ)) {
                  minWallDistZ = distBack;
                  snapWallDZ = backWallZ - ac.z;
                }
                if (Math.abs(distFront) < SNAP_THRESHOLD && Math.abs(distFront) < Math.abs(minWallDistZ)) {
                  minWallDistZ = distFront;
                  snapWallDZ = frontWallZ - ac.z;
                }
              });
              if (Math.abs(snapWallDZ) > 0) {
                targetZ += snapWallDZ;
              }

              // 2. X-axis Wall Snapping (Left Wall: X = -roomWidthRef.current / 2, Right Wall: X = roomWidthRef.current / 2)
              activeCorners = getActiveWorldCorners(targetX, targetZ);
              let snapWallDX = 0;
              let minWallDistX = Infinity;
              activeCorners.forEach(ac => {
                const leftWallX = -roomWidthRef.current / 2;
                const rightWallX = roomWidthRef.current / 2;
                const distLeft = ac.x - leftWallX;
                const distRight = ac.x - rightWallX;

                if (Math.abs(distLeft) < SNAP_THRESHOLD && Math.abs(distLeft) < Math.abs(minWallDistX)) {
                  minWallDistX = distLeft;
                  snapWallDX = leftWallX - ac.x;
                }
                if (Math.abs(distRight) < SNAP_THRESHOLD && Math.abs(distRight) < Math.abs(minWallDistX)) {
                  minWallDistX = distRight;
                  snapWallDX = rightWallX - ac.x;
                }
              });
              if (Math.abs(snapWallDX) > 0) {
                targetX += snapWallDX;
              }

              // ── B. CABINET EDGE-TO-EDGE X SNAPPING ──
              // Only snap on X axis (side-by-side). Z snapping handled separately.
              {
                let closestSnapX = targetX;
                let minDistX = Infinity;

                currentModules.forEach((other) => {
                  if (other.id === activeModId) return;
                  const isOtherUpper = (other.type === 'kitchen_upper' || other.type === 'hood' || other.type === 'built_in_hood' || other.type === 'microwave');
                  if (isActiveUpper !== isOtherUpper) return;

                  const otherW = other.config.width;

                  // Left edge of active touches right edge of other
                  const gapL2R = (targetX - activeW / 2) - (other.xOffset + otherW / 2);
                  if (Math.abs(gapL2R) < SNAP_THRESHOLD && Math.abs(gapL2R) < minDistX) {
                    minDistX = Math.abs(gapL2R);
                    closestSnapX = other.xOffset + otherW / 2 + activeW / 2;
                  }

                  // Right edge of active touches left edge of other
                  const gapR2L = (targetX + activeW / 2) - (other.xOffset - otherW / 2);
                  if (Math.abs(gapR2L) < SNAP_THRESHOLD && Math.abs(gapR2L) < minDistX) {
                    minDistX = Math.abs(gapR2L);
                    closestSnapX = other.xOffset - otherW / 2 - activeW / 2;
                  }
                });
                if (minDistX < Infinity) {
                  targetX = closestSnapX;
                }
              }

              // ── C. BACK-FACE Z ALIGNMENT SNAP ──
              // Align the back face of active module with the back face of other modules
              {
                let closestSnapZ = targetZ;
                let minDistZ = Infinity;
                const activeBackZ = targetZ - activeD / 2; // back face Z of active

                currentModules.forEach((other) => {
                  if (other.id === activeModId) return;
                  const isOtherUpper = (other.type === 'kitchen_upper' || other.type === 'hood' || other.type === 'built_in_hood' || other.type === 'microwave');
                  if (isActiveUpper !== isOtherUpper) return;

                  const otherD = other.config.depth;
                  const otherBackZ = other.zOffset - otherD / 2; // back face of other

                  // Align back-face to back-face
                  const distBackToBack = Math.abs(activeBackZ - otherBackZ);
                  if (distBackToBack < SNAP_THRESHOLD && distBackToBack < minDistZ) {
                    minDistZ = distBackToBack;
                    closestSnapZ = otherBackZ + activeD / 2; // place so back faces align
                  }
                });
                if (minDistZ < Infinity) {
                  targetZ = closestSnapZ;
                }
              }
            }
          }

          // No hard clamp - wall snapping (A above) handles alignment near walls.
          // Modules can be placed freely; they snap to walls when within threshold.

          draggedGroup.position.x = targetX;
          draggedGroup.position.z = targetZ;
        }
      };

      const onPointerUp = () => {
        // Handle shelf dragging commit
        if (draggedShelfMesh && parentModuleGroup) {
          if (controlsRef.current) controlsRef.current.enabled = true; // Re-enable camera orbiting

          // Clear highlight glow
          if (draggedShelfMesh.material && !Array.isArray(draggedShelfMesh.material)) {
            const mat = draggedShelfMesh.material as any;
            if (mat.emissive) {
              mat.emissive.setHex(0x000000);
            }
          }

          // Commit Y height change to the store ONLY if threshold was passed and we actually dragged it
          if (isDraggingShelf) {
            const currentModuleId = parentModuleGroup.name;
            const activeMod = projectRef.current.modules || [];
            const activeModItem = activeMod.find(m => m.id === currentModuleId);
            if (activeModItem) {
              const config = activeModItem.config;
              const sPositions = config.shelfPositions || [];
              const legHeight = config.hasLegs ? 100 : 0;
              const finalY = draggedShelfMesh.position.y - legHeight - 18;
              
              const newPos = [...sPositions];
              newPos[draggedShelfIndex] = Math.round(finalY);
              updateActiveConfig({ shelfPositions: newPos });
            }
          }

          isDraggingShelf = false;
          draggedShelfMesh = null;
          parentModuleGroup = null;
          draggedShelfIndex = -1;
        }

        // Handle partition dragging commit
        else if (draggedPartitionMesh && parentModuleGroup) {
          if (controlsRef.current) controlsRef.current.enabled = true; // Re-enable camera orbiting

          // Clear highlight glow
          if (draggedPartitionMesh.material && !Array.isArray(draggedPartitionMesh.material)) {
            const mat = draggedPartitionMesh.material as any;
            if (mat.emissive) {
              mat.emissive.setHex(0x000000);
            }
          }

          // Commit X position change to the store ONLY if threshold was passed and we actually dragged it
          if (isDraggingPartition) {
            const currentModuleId = parentModuleGroup.name;
            const activeMod = projectRef.current.modules || [];
            const activeModItem = activeMod.find(m => m.id === currentModuleId);
            if (activeModItem) {
              const config = activeModItem.config;
              const width = Number(config.width) || 0;
              const halfW = width / 2;
              const dPositions = config.dividerPositions || [];
              const finalX = draggedPartitionMesh.position.x + halfW;
              
              const newPos = [...dPositions];
              newPos[draggedPartitionIndex] = Math.round(finalX);
              updateActiveConfig({ dividerPositions: newPos });
            }
          }

          isDraggingPartition = false;
          draggedPartitionMesh = null;
          parentModuleGroup = null;
          draggedPartitionIndex = -1;
        }

        // Stop measure sphere dragging
        else if (measureDragging) {
          measureDragging = null;
          if (controlsRef.current) controlsRef.current.enabled = true;
          if (rendererRef.current?.domElement) rendererRef.current.domElement.style.cursor = 'crosshair';
        }

        else if (draggedGroup) {
          if (controlsRef.current) controlsRef.current.enabled = true; // Re-enable camera orbiting

          // Commit position coordinate change to store ONLY if threshold was passed and we actually dragged it
          if (isDragging) {
            updateModulePosition(draggedGroup.name, draggedGroup.position.x, draggedGroup.position.y, draggedGroup.position.z);
          }

          // Clear highlight glow
          draggedGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material && !Array.isArray(child.material)) {
              const mat = child.material as any;
              if (mat.emissive) {
                mat.emissive.setHex(0x000000);
              }
            }
          });

          isDragging = false;
          draggedGroup = null;
        }

        // Reset threshold variables
        activeDragType = null;
        dragThresholdPassed = false;
      };

      const onContextMenu = (event: MouseEvent) => {
        event.preventDefault(); // prevent browser default context menu

        if (!rendererRef.current || !cameraRef.current) return;

        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(furnitureGroup.children, true);
        if (intersects.length > 0) {
          // Trace up to find top-level group directly under furnitureGroup
          let obj: THREE.Object3D | null = intersects[0].object;
          let group: THREE.Group | null = null;
          while (obj && obj !== scene) {
            if (obj.parent === furnitureGroup) {
              group = obj as THREE.Group;
              break;
            }
            obj = obj.parent;
          }

          if (group && group.name) {
            setSelectedModuleId(group.name);
            if (onRightClickModule) {
              // Call parent callback with moduleId and absolute click position on page
              onRightClickModule(group.name, event.clientX, event.clientY);
            }
          }
        }
      };

      const onDoubleClick = (event: MouseEvent) => {
        if (!rendererRef.current || !cameraRef.current) return;

        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(furnitureGroup.children, true);

        if (intersects.length > 0) {
          let obj: THREE.Object3D | null = intersects[0].object;
          let group: THREE.Group | null = null;
          while (obj && obj !== scene) {
            if (obj.parent === furnitureGroup) {
              group = obj as THREE.Group;
              break;
            }
            obj = obj.parent;
          }

          if (group && group.name) {
            setSelectedModuleId(group.name);
            if (onDoubleClickModule) {
              onDoubleClickModule(group.name);
            }
          }
        }
      };

      // Add pointer listeners for dragging
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('pointerleave', onPointerUp);
      renderer.domElement.addEventListener('contextmenu', onContextMenu);
      renderer.domElement.addEventListener('dblclick', onDoubleClick);

      // 5. Grid/Floor plane — 10m × 10m with 100mm cells
      const gridHelper = new THREE.GridHelper(10000, 100, '#3a4040', '#2e3535');
      gridHelper.position.y = -2;
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;

      // Floor plane - dark concrete tone
      const floorGeo = new THREE.PlaneGeometry(12000, 12000);
      const floorMat = new THREE.MeshLambertMaterial({ color: '#1e2424', side: THREE.FrontSide });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -2;
      floor.receiveShadow = true;
      scene.add(floor);
      floorMeshRef.current = floor;

      // Window resize handler
      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight || 500;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // Animation Loop
      const animate = () => {
        animId = requestAnimationFrame(animate);
        
        // Interpolate animation factors for smooth transitions
        animState.current.explodeFactor += ( (explodeRef.current ? 1 : 0) - animState.current.explodeFactor ) * 0.1;
        animState.current.doorOpenFactor += ( (openDoorsRef.current ? 1 : 0) - animState.current.doorOpenFactor ) * 0.08;

        // Update interactive transformations inside groups
        updatePiecePositions();

        const labelsContainer = document.getElementById('dimensions-labels-container') as HTMLDivElement | null;
        if (labelsContainer) {
          updateDimensionLabelsRef.current(labelsContainer);
        }

        if (controlsRef.current) controlsRef.current.update();
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          const now = Date.now();
          if (now - lastScreenshotTime > 1500) {
            lastScreenshotTime = now;
            try {
              const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
              sessionStorage.setItem('tavmax-three-screenshot', dataUrl);
            } catch (e) {
              console.error('Error saving 3D screenshot', e);
            }
          }
        }
      };
      animate();

      return () => {
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        if (renderer && renderer.domElement) {
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          renderer.domElement.removeEventListener('pointerleave', onPointerUp);
          renderer.domElement.removeEventListener('contextmenu', onContextMenu);
          renderer.domElement.removeEventListener('dblclick', onDoubleClick);
          if (container && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        }
        if (renderer) renderer.dispose();
      };
    } catch (err: any) {
      const msg = err?.stack || err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setEngineError(msg);
      console.error('ThreeViewer init error:', err);
    }
  }, []);

  const isFirstViewModeRef = useRef(true);

  // Update cameras based on view mode props
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    // Check if we have a saved camera state on first mount to prevent overriding it
    const hasSavedCam = sessionStorage.getItem('tavmax-camera-pos') !== null;
    if (isFirstViewModeRef.current) {
      isFirstViewModeRef.current = false;
      if (hasSavedCam) {
        return; // Skip camera reset on initial mount
      }
    }

    const cHeight = project.config.height / 2;
    controlsRef.current.target.set(0, cHeight, 0);

    const tweenCamera = (px: number, py: number, pz: number) => {
      cameraRef.current!.position.set(px, py, pz);
    };

    switch (viewMode) {
      case 'front':
        tweenCamera(0, cHeight, 5000);
        break;
      case 'top':
        tweenCamera(0, cHeight + 5000, 0.1);
        break;
      case 'side':
        tweenCamera(5000, cHeight, 0);
        break;
      default:
        // Perspective standard
        tweenCamera(2200, 1800, 3200);
        break;
    }
  }, [viewMode]);

  // Room environment useEffect — build/remove room when props change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove previous room group if exists
    if (roomGroupRef.current) {
      scene.remove(roomGroupRef.current);
      roomGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      roomGroupRef.current = null;
    }

    // Toggle existing grid and floor visibility
    if (gridHelperRef.current) gridHelperRef.current.visible = !showRoom;
    if (floorMeshRef.current) floorMeshRef.current.visible = !showRoom;

    if (!showRoom) return;

    // Build room environment
    const roomGroup = new THREE.Group();
    roomGroup.name = '__room_environment__';

    const w = roomWidth;
    const d = roomDepth;
    const h = roomHeight;

    // --- Helper: create tile texture ---
    const createTileTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#d4d0cc';
      ctx.fillRect(0, 0, 512, 512);
      // Draw tile grid
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2;
      const tileSize = 128;
      for (let x = 0; x <= 512; x += tileSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
      }
      for (let y = 0; y <= 512; y += tileSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      }
      // Subtle shading per tile
      for (let tx = 0; tx < 4; tx++) {
        for (let ty = 0; ty < 4; ty++) {
          const shade = 0.97 + Math.random() * 0.06;
          ctx.fillStyle = `rgba(${Math.floor(212*shade)},${Math.floor(208*shade)},${Math.floor(204*shade)},0.3)`;
          ctx.fillRect(tx * tileSize + 2, ty * tileSize + 2, tileSize - 4, tileSize - 4);
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(w / 1000, d / 1000);
      return texture;
    };

    // --- Floor material based on type ---
    let floorMaterial: THREE.MeshStandardMaterial;
    switch (roomFloorType) {
      case 'wood': {
        const tex = createWoodTexture();
        tex.repeat.set(w / 800, d / 800);
        floorMaterial = new THREE.MeshStandardMaterial({
          map: tex,
          color: '#b8956a',
          roughness: 0.7,
          metalness: 0.0,
          side: THREE.FrontSide,
        });
        break;
      }
      case 'tile': {
        const tex = createTileTexture();
        floorMaterial = new THREE.MeshStandardMaterial({
          map: tex,
          color: '#d4d0cc',
          roughness: 0.5,
          metalness: 0.05,
          side: THREE.FrontSide,
        });
        break;
      }
      case 'marble': {
        const tex = createMarbleTexture();
        tex.repeat.set(w / 1500, d / 1500);
        floorMaterial = new THREE.MeshStandardMaterial({
          map: tex,
          color: '#f0ece8',
          roughness: 0.2,
          metalness: 0.1,
          side: THREE.FrontSide,
        });
        break;
      }
      case 'concrete':
      default: {
        floorMaterial = new THREE.MeshStandardMaterial({
          color: '#7a7a7a',
          roughness: 0.9,
          metalness: 0.0,
          side: THREE.FrontSide,
        });
        break;
      }
    }

    // Room floor
    const roomFloorGeo = new THREE.PlaneGeometry(w, d);
    const roomFloor = new THREE.Mesh(roomFloorGeo, floorMaterial);
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(0, -1, -d / 2 + d / 2); // center at origin
    roomFloor.position.set(0, -1, 0);
    roomFloor.receiveShadow = true;
    roomGroup.add(roomFloor);

    // Wall material
    const wallMat = new THREE.MeshStandardMaterial({
      color: roomWallColor,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.FrontSide,
    });

    // Baseboard material
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: '#e8e4df',
      roughness: 0.4,
      metalness: 0.05,
    });
    const baseboardHeight = 60;

    // Back wall (at z = -d/2, facing +z)
    const backWallGeo = new THREE.PlaneGeometry(w, h);
    const backWall = new THREE.Mesh(backWallGeo, wallMat.clone());
    backWall.position.set(0, h / 2, -d / 2);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Back baseboard
    const backBaseGeo = new THREE.BoxGeometry(w, baseboardHeight, 12);
    const backBase = new THREE.Mesh(backBaseGeo, baseboardMat.clone());
    backBase.position.set(0, baseboardHeight / 2, -d / 2 + 6);
    roomGroup.add(backBase);

    // Left wall (at x = -w/2, facing +x)
    const leftWallGeo = new THREE.PlaneGeometry(d, h);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat.clone());
    leftWall.position.set(-w / 2, h / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Left baseboard
    const leftBaseGeo = new THREE.BoxGeometry(12, baseboardHeight, d);
    const leftBase = new THREE.Mesh(leftBaseGeo, baseboardMat.clone());
    leftBase.position.set(-w / 2 + 6, baseboardHeight / 2, 0);
    roomGroup.add(leftBase);

    // Right wall (at x = w/2, facing -x)
    const rightWallGeo = new THREE.PlaneGeometry(d, h);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat.clone());
    rightWall.position.set(w / 2, h / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Right baseboard
    const rightBaseGeo = new THREE.BoxGeometry(12, baseboardHeight, d);
    const rightBase = new THREE.Mesh(rightBaseGeo, baseboardMat.clone());
    rightBase.position.set(w / 2 - 6, baseboardHeight / 2, 0);
    roomGroup.add(rightBase);

    scene.add(roomGroup);
    roomGroupRef.current = roomGroup;
  }, [showRoom, roomWallColor, roomFloorType, roomWidth, roomDepth, roomHeight]);

  // Re-build 3D objects whenever modules configuration, materials, or dimension options change
  useEffect(() => {
    buildFurnitureModel();
  }, [project.modules, materials, showDimensions, selectedModuleId]);

  // Build the 3D panels
  function buildFurnitureModel() {
    console.log("ThreeViewer: buildFurnitureModel triggered! Modules count:", project.modules?.length || 0);
    if ((window as any).tavmaxLog) {
      (window as any).tavmaxLog(`buildFurnitureModel started for project: ${project.id}. Modules count: ${project.modules?.length || 0}`);
    }
    try {
      const furnitureGroup = furnitureGroupRef.current;
      const dimsGroup = dimsGroupRef.current;
      if (!furnitureGroup || !dimsGroup) {
        if ((window as any).tavmaxLog) {
          (window as any).tavmaxLog(`buildFurnitureModel aborted: groups not ready`);
        }
        return;
      }

      // Clear previous children
      while (furnitureGroup.children.length > 0) {
        furnitureGroup.remove(furnitureGroup.children[0]);
      }
      while (dimsGroup.children.length > 0) {
        dimsGroup.remove(dimsGroup.children[0]);
      }

      const projectModules = project.modules || [];
      projectModules.forEach((mod) => {
        if ((window as any).tavmaxLog) {
          (window as any).tavmaxLog(`Rendering module: ${mod.id} (${mod.name}), type: ${mod.type}, config: ${JSON.stringify(mod.config)}`);
        }
        const moduleGroup = new THREE.Group();
        moduleGroup.name = mod.id;
        moduleGroup.position.set(mod.xOffset, mod.yOffset, mod.zOffset);
        if (mod.rotation) moduleGroup.rotation.y = mod.rotation;
        furnitureGroup.add(moduleGroup);


        const config = mod.config;
        const width = Number(config.width) || 0;
        const height = Number(config.height) || 0;
        const depth = Number(config.depth) || 0;
        const shelves = Number(config.shelves) || 0;
        const drawers = Number(config.drawers) || 0;
        const doors = Number(config.doors) || 0;
        const hasLegs = !!config.hasLegs;
        const { materialId, doorMaterialId, handleType } = config;

        const halfW = width / 2;
        const halfD = depth / 2;
        const legHeight = hasLegs ? 100 : 0;
        const bodyHeight = height - legHeight;

        // Material caching helper
        const primaryMatInfo = materials.find((m) => m.id === materialId) || materials[0];

        const getMaterialMesh = (matId: string, isFront: boolean = false) => {
          const mat = materials.find((m) => m.id === matId) || primaryMatInfo;
          let colorHex: string;
          if (isFront) {
            colorHex = config.color || mat.color;
          } else {
            colorHex = config.bodyColor || mat.color;
          }
          
          const isWoodMat = mat.category === 'Egger' || mat.category === 'Plywood' || mat.id === 'mat-ct-wood' || mat.id === 'mat-1' || mat.id === 'mat-2' || mat.id === 'mat-5';
          
          return new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorHex),
            map: isWoodMat ? getWoodTexture() : null,
            roughness: mat.category === 'Acrylic' ? 0.05 : (isWoodMat ? 0.35 : 0.6),
            metalness: mat.category === 'Acrylic' ? 0.1 : 0.0,
            bumpScale: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
          });
        };

        const getCountertopMaterial = (ctType: string) => {
          if (ctType === 'stone') {
            const stoneTex = getMarbleTexture();
            return new THREE.MeshStandardMaterial({
              map: stoneTex,
              roughness: 0.15,
              metalness: 0.05,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1
            });
          } else {
            const woodTex = getWoodTexture();
            return new THREE.MeshStandardMaterial({
              map: woodTex,
              color: new THREE.Color('#d97706'), // Warm wood brown tint
              roughness: 0.35,
              metalness: 0.0,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1
            });
          }
        };

        const bodyMat = getMaterialMesh(materialId, false);
        const doorMat = getMaterialMesh(doorMaterialId, true);
        const hdfMat = getMaterialMesh('mat-7', false); // HDF back panel

        // Helper to add a board mesh to module group
        const addBoard = (
          w: number,
          h: number,
          d: number,
          x: number,
          y: number,
          z: number,
          mat: THREE.Material,
          name: string,
          category: string,
          userData: any = {}
        ) => {
          // Classic style applies to doors AND drawer fronts
          const isDrawerFront = category === 'Шургуулга';
          const isDoorOrDrawer = category === 'Хаалга' || isDrawerFront;
          const isClassicDoor = isDoorOrDrawer && 
            config.doorStyle === 'classic' && 
            !['fridge', 'oven', 'microwave', 'cooktop'].includes(mod.type) &&
            !name.includes('шил') && 
            !name.includes('Шил') &&
            w >= 120 &&
            h >= 120;
          
          if (isDoorOrDrawer) {
            console.log(`[ThreeViewer:addBoard] name="${name}" category="${category}" isDrawerFront=${isDrawerFront} doorStyle="${config?.doorStyle}" isClassicDoor=${isClassicDoor} modType="${mod.type}"`);
          }
          
          let geom: THREE.BufferGeometry;
          let mesh: THREE.Mesh;

          const getDarkerMaterial = (baseMat: THREE.Material, factor: number) => {
            const cloned = baseMat.clone();
            if ((cloned as any).color) {
              (cloned as any).color.multiplyScalar(factor);
            }
            return cloned;
          };

          const addOutline = (m: THREE.Mesh, g: THREE.BufferGeometry) => {
            const edges = new THREE.EdgesGeometry(g);
            const lineMat = new THREE.LineBasicMaterial({
              color: 0x0a0a0e,
              transparent: true,
              opacity: 0.55,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1
            });
            const line = new THREE.LineSegments(edges, lineMat);
            m.add(line);
          };
          
          if (isClassicDoor) {
            // BASE BOARD — the main door board (will be used for animation)
            geom = new THREE.BoxGeometry(w, h, 18);
            mesh = new THREE.Mesh(geom, getDarkerMaterial(mat, 0.75));
            
            // Helper: brighter version of door material
            const getBrighter = (factor: number) => {
              const cloned = mat.clone() as THREE.MeshStandardMaterial;
              if (cloned.color) cloned.color.multiplyScalar(factor);
              return cloned;
            };
            
            // Frame dimensions — similar for drawer fronts, normal for doors
            const isDrawerFront = category === 'Шургуулга';
            const doorFW = Math.max(55, Math.min(85, w * 0.20));
            const fW = isDrawerFront
              ? Math.max(30, Math.min(doorFW, h * 0.28))   // scale frame width down if drawer is too short, but let it match door if possible
              : doorFW;            // normal frame for doors
            const fT = 10;   // identical protrusion for both to look similar
            // Base board front face is at local z = +9 (half of 18mm)
            // Frame sits on top of that: center at z = 9 + fT/2 = 14
            const fZ = 9 + fT / 2;
            const frameMat = getBrighter(1.18);

            // Dynamic classic panel parameters scaled based on frame thickness fT
            const grooveT = fT * 0.5;
            const grooveZ = 9 + grooveT / 2;
            const rfT = fT * 0.8;
            const rfZ = 9 + rfT;

            // LEFT stile
            const lGeo = new THREE.BoxGeometry(fW, h, fT);
            const lMesh = new THREE.Mesh(lGeo, frameMat);
            lMesh.position.set(-w / 2 + fW / 2, 0, fZ);
            lMesh.userData = { isInternalClassicPart: true };
            lMesh.castShadow = true; lMesh.receiveShadow = true;
            addOutline(lMesh, lGeo);
            mesh.add(lMesh);

            // RIGHT stile
            const rGeo = new THREE.BoxGeometry(fW, h, fT);
            const rMesh = new THREE.Mesh(rGeo, frameMat);
            rMesh.position.set(w / 2 - fW / 2, 0, fZ);
            rMesh.userData = { isInternalClassicPart: true };
            rMesh.castShadow = true; rMesh.receiveShadow = true;
            addOutline(rMesh, rGeo);
            mesh.add(rMesh);

            // TOP rail
            const railW = w - 2 * fW;
            const tGeo = new THREE.BoxGeometry(railW, fW, fT);
            const tMesh = new THREE.Mesh(tGeo, frameMat);
            tMesh.position.set(0, h / 2 - fW / 2, fZ);
            tMesh.userData = { isInternalClassicPart: true };
            tMesh.castShadow = true; tMesh.receiveShadow = true;
            addOutline(tMesh, tGeo);
            mesh.add(tMesh);

            // BOTTOM rail
            const bGeo = new THREE.BoxGeometry(railW, fW, fT);
            const bMesh = new THREE.Mesh(bGeo, frameMat);
            bMesh.position.set(0, -h / 2 + fW / 2, fZ);
            bMesh.userData = { isInternalClassicPart: true };
            bMesh.castShadow = true; bMesh.receiveShadow = true;
            addOutline(bMesh, bGeo);
            mesh.add(bMesh);

            // MIDDLE rail for tall doors (>850mm)
            const hasMidRail = h > 850;
            if (hasMidRail) {
              const mGeo = new THREE.BoxGeometry(railW, fW * 0.8, fT);
              const mMesh = new THREE.Mesh(mGeo, frameMat);
              mMesh.position.set(0, 0, fZ);
              mMesh.userData = { isInternalClassicPart: true };
              mMesh.castShadow = true; mMesh.receiveShadow = true;
              addOutline(mMesh, mGeo);
              mesh.add(mMesh);
            }

            // RECESSED PANELS inside the frame opening
            const panelInnerW = w - 2 * fW;
            const fullInnerH = h - 2 * fW;
            const panelCount = hasMidRail ? 2 : 1;
            const midRailH = hasMidRail ? fW * 0.8 : 0;
            const singlePanelH = hasMidRail
              ? (fullInnerH - midRailH - 8) / 2
              : fullInnerH - 8;

            const addPanel = (centerY: number, pH: number) => {
              if (panelInnerW < 20 || pH < 20) return;
              // Dark groove recess area
              const grooveGeo = new THREE.BoxGeometry(panelInnerW - 2, pH - 2, grooveT);
              const grooveMesh = new THREE.Mesh(grooveGeo, getDarkerMaterial(mat, 0.68));
              grooveMesh.position.set(0, centerY, grooveZ);
              grooveMesh.userData = { isInternalClassicPart: true };
              grooveMesh.castShadow = true; grooveMesh.receiveShadow = true;
              addOutline(grooveMesh, grooveGeo);
              mesh.add(grooveMesh);

              // Raised centre field
              const rfW = panelInnerW - 20;
              const rfH = pH - 20;
              if (rfW > 8 && rfH > 8) {
                const rfGeo = new THREE.BoxGeometry(rfW, rfH, rfT);
                const rfMesh = new THREE.Mesh(rfGeo, getBrighter(1.05));
                rfMesh.position.set(0, centerY, rfZ);
                rfMesh.userData = { isInternalClassicPart: true };
                rfMesh.castShadow = true; rfMesh.receiveShadow = true;
                addOutline(rfMesh, rfGeo);
                mesh.add(rfMesh);
              }
            };

            if (panelCount === 2) {
              const offset = singlePanelH / 2 + midRailH / 2 + 4;
              addPanel(offset, singlePanelH);
              addPanel(-offset, singlePanelH);
            } else {
              addPanel(0, singlePanelH);
            }
          } else {
            geom = new THREE.BoxGeometry(w, h, d);
            mesh = new THREE.Mesh(geom, mat);
          }
          
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          // Don't add outline to countertop boards — prevents visible seam lines between adjacent modules
          const isCountertopBoard = name.toLowerCase().includes('тавцан');
          if (!isCountertopBoard) {
            addOutline(mesh, geom);
          }

          mesh.userData = {
            id: userData.id || `p-gen-${category.toLowerCase().replace(/ /g, '-')}-${Date.now()}-${Math.random()}`,
            name,
            category,
            baseX: x,
            baseY: y,
            baseZ: z,
            expX: x * 0.25,
            expY: (y - height / 2) * 0.25,
            expZ: z * 0.35,
            ...userData
          };

          mesh.position.set(x, y, z);
          moduleGroup.add(mesh);
          return mesh;
        };

        // Render Legs (Closed 10cm Plinth / Socle or Cylinder columns)
        const buildLegs = () => {
          if (!hasLegs) return;
          const legStyle = config.legStyle || 'plinth';
          
          if (legStyle === 'cylinder') {
            const legGeo = new THREE.CylinderGeometry(20, 12, 100, 16);
            const legM = new THREE.MeshStandardMaterial({
              color: '#111827',
              metalness: 0.5,
              roughness: 0.5,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1
            });
            const lx1 = -halfW + 40;
            const lx2 = halfW - 40;
            const lz1 = -halfD + 40;
            const lz2 = halfD - 40;
            
            [[lx1, 50, lz1], [lx1, 50, lz2], [lx2, 50, lz1], [lx2, 50, lz2]].forEach(([lx, ly, lz]) => {
              const leg = new THREE.Mesh(legGeo, legM);
              leg.position.set(lx, ly, lz);
              leg.castShadow = true;
              leg.userData = {
                category: 'leg',
                baseX: lx,
                baseY: ly,
                baseZ: lz,
                expX: lx * 0.1,
                expY: -35,
                expZ: lz * 0.1
              };
              moduleGroup.add(leg);
            });
          } else {
            // Front plinth board
            const fPlinthW = width;
            const fPlinthGeo = new THREE.BoxGeometry(fPlinthW, 100, 18);
            const fPlinth = new THREE.Mesh(fPlinthGeo, bodyMat);
            fPlinth.castShadow = true;
            fPlinth.receiveShadow = true;
            const fPlinthZ = halfD - 9;
            fPlinth.position.set(0, 50, fPlinthZ);
            fPlinth.userData = {
              category: 'leg',
              baseX: 0,
              baseY: 50,
              baseZ: fPlinthZ,
              expX: 0,
              expY: -35,
              expZ: 15
            };
            moduleGroup.add(fPlinth);

            // Back plinth board
            const bPlinthW = Math.max(10, width - 36);
            const bPlinthGeo = new THREE.BoxGeometry(bPlinthW, 100, 18);
            const bPlinth = new THREE.Mesh(bPlinthGeo, bodyMat);
            bPlinth.castShadow = true;
            bPlinth.receiveShadow = true;
            const bPlinthZ = -halfD + 29;
            bPlinth.position.set(0, 50, bPlinthZ);
            bPlinth.userData = {
              category: 'leg',
              baseX: 0,
              baseY: 50,
              baseZ: bPlinthZ,
              expX: 0,
              expY: -35,
              expZ: -15
            };
            moduleGroup.add(bPlinth);

            // Side plinth boards (Left & Right)
            const sPlinthD = Math.max(10, depth - 47);
            const sPlinthGeo = new THREE.BoxGeometry(18, 100, sPlinthD);
            
            // Left side plinth
            const lPlinth = new THREE.Mesh(sPlinthGeo, bodyMat);
            lPlinth.castShadow = true;
            lPlinth.receiveShadow = true;
            const lPlinthX = -halfW + 9;
            const sidePlinthZ = halfD - 18 - sPlinthD / 2;
            lPlinth.position.set(lPlinthX, 50, sidePlinthZ);
            lPlinth.userData = {
              category: 'leg',
              baseX: lPlinthX,
              baseY: 50,
              baseZ: sidePlinthZ,
              expX: -10,
              expY: -35,
              expZ: 0
            };
            moduleGroup.add(lPlinth);

            // Right side plinth
            const rPlinth = new THREE.Mesh(sPlinthGeo, bodyMat);
            rPlinth.castShadow = true;
            rPlinth.receiveShadow = true;
            const rPlinthX = halfW - 9;
            rPlinth.position.set(rPlinthX, 50, sidePlinthZ);
            rPlinth.userData = {
              category: 'leg',
              baseX: rPlinthX,
              baseY: 50,
              baseZ: sidePlinthZ,
              expX: 10,
              expY: -35,
              expZ: 0
            };
            moduleGroup.add(rPlinth);
          }
        };

        const modParts = mod.parts || [];
        if ((window as any).tavmaxLog) {
          (window as any).tavmaxLog(`Module parts for ${mod.id} (${mod.type}): ${JSON.stringify(modParts.map(p => ({ id: p.id, name: p.name, qty: p.quantity })))}`);
        }

        if (mod.type === 'custom') {
          // Render legs if enabled
          buildLegs();

          // Render Custom / Manual parts list sequentially
          modParts.forEach((part) => {
            const isCountertop = part.id.includes('countertop');
            const mat = isCountertop 
              ? getCountertopMaterial(config.countertopType || 'none')
              : getMaterialMesh(part.materialId);
            const quantity = Number(part.quantity) || 0;

            for (let qIdx = 0; qIdx < quantity; qIdx++) {
              let w = Number(part.width) || 0;
              let h = Number(part.height) || 0;
              let d = 18;

              if (part.category === 'Хажуу хана') {
                w = 18;
                h = part.height;
                d = part.width;
              } else if (part.category === 'Дээд тавиур' || part.category === 'Доод тавиур') {
                w = part.height;
                h = part.id.includes('countertop') ? 38 : 18;
                d = part.width;
              } else if (part.category === 'Ар тал') {
                w = part.width;
                h = part.height;
                d = 3;
              } else if (part.category === 'Хуваалт') {
                w = 18;
                h = part.height;
                d = part.width;
              } else if (part.category === 'Хаалга') {
                w = part.width;
                h = part.height;
                d = 18;
              } else if (part.category === 'Шургуулга') {
                w = part.height;
                h = part.width;
                d = 18;
              }

              let px = 0;
              let py = legHeight + h / 2;
              let pz = 0;

              const isManual = part.id.includes('manual') || part.id.startsWith('p-manual-');
              if (isManual) {
                px = part.xOffset ?? 0;
                py = part.yOffset ?? (legHeight + h / 2 + qIdx * 20);
                pz = part.zOffset ?? (qIdx * 20);
              } else

              if (part.category === 'Хажуу хана') {
                if (quantity === 2) {
                  px = qIdx === 0 ? -halfW + 9 : halfW - 9;
                } else {
                  px = part.name.includes('Зүүн') ? -halfW + 9 : halfW - 9;
                }
                py = legHeight + h / 2;
                pz = 0;
              } else if (part.category === 'Дээд тавиур') {
                if (part.id.includes('countertop')) {
                  px = 0;
                  py = height + 19;
                  pz = 12.5;
                } else if (part.name.includes('таг') || part.id.includes('p-c-3')) {
                  px = 0;
                  py = height - 9;
                  pz = 0;
                } else {
                  // Internal shelves
                  py = getShelfY(qIdx, quantity, bodyHeight - 36, legHeight, config);
                  const match = part.id.match(/shelf-(\d+)/);
                  if (match) {
                    const sIdx = parseInt(match[1]);
                    const sections = getCabinetSections(width, config, 'custom');
                    if (sIdx < sections.length) {
                      px = sections[sIdx].centerX;
                    } else {
                      px = 0;
                    }
                  } else {
                    px = 0;
                  }
                  pz = 0;
                }
              } else if (part.category === 'Доод тавиур') {
                px = 0;
                py = legHeight + 9;
                pz = 0;
              } else if (part.category === 'Хуваалт') {
                const match = part.id.match(/div-(\d+)/);
                if (match) {
                  const idx = parseInt(match[1]);
                  const dPositions = config.dividerPositions || [];
                  if (idx < dPositions.length) {
                    px = -halfW + dPositions[idx];
                  } else {
                    const partitionsCount = config.partitions || 1;
                    px = -halfW + Math.round((idx + 1) * width / (partitionsCount + 1));
                  }
                } else if (part.id.includes('divider-middle') || part.id.includes('p-c-divider-middle')) {
                  px = 0;
                } else if (quantity > 1) {
                  px = -halfW + 18 + (qIdx + 1) * ((width - 36) / (quantity + 1));
                } else {
                  px = 0;
                }
                py = legHeight + bodyHeight / 2;
                pz = 0;
              } else if (part.category === 'Хаалга') {
                const doorW = Number(part.width);
                const doorH = Number(part.height);
                const hasLeft = part.id.includes('left');
                const hasRight = part.id.includes('right');
                
                if (hasLeft) {
                  px = width >= 800 ? -halfW + 5 + doorW / 2 : 0;
                } else if (hasRight) {
                  px = width >= 800 ? halfW - 5 - doorW / 2 : 0;
                } else {
                  const doorW_generic = (width - 10) / quantity;
                  px = -halfW + 5 + doorW_generic / 2 + qIdx * doorW_generic;
                }
                
                py = legHeight + 5 + doorH / 2;
                pz = halfD + 9;
              } else if (part.category === 'Шургуулга') {
                px = 0;
                const drH = (bodyHeight - 10) / quantity;
                py = legHeight + drH / 2 + 5 + qIdx * drH;
                pz = halfD + 9;
              } else if (part.category === 'Ар тал') {
                px = 0;
                py = legHeight + bodyHeight / 2;
                pz = -halfD + 1.5;
              } else {
                px = 0;
                py = legHeight + h / 2 + qIdx * 20;
                pz = 0;
              }

              const partitionMatch = part.id.match(/div-(\d+)/);
              const partitionIdx = partitionMatch ? parseInt(partitionMatch[1]) : undefined;
              const boardMesh = addBoard(w, h, d, px, py, pz, mat, part.name, part.category, {
                id: `${part.id}-${qIdx}`,
                partitionIndex: partitionIdx
              });

              if (part.category === 'Шургуулга' && handleType !== 'none') {
                const handleGeom = new THREE.CylinderGeometry(4, 4, Math.min(120, w * 0.4), 16);
                const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.rotation.z = Math.PI / 2;
                handle.position.set(0, 0, 12);
                boardMesh.add(handle);
              }
            }
          });
        } else if (mod.type === 'bookshelf') {
          // Bookshelf
          buildLegs();
          addBoard(18, bodyHeight, depth, -halfW + 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Зүүн)', 'Хажуу хана');
          addBoard(18, bodyHeight, depth, halfW - 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Дээд таг хавтан', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, legHeight + 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');
          addBoard(width, bodyHeight, 3, 0, legHeight + bodyHeight / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          const sections = getCabinetSections(width, config, 'bookshelf');
          const partitions = sections.length - 1;
          const leftInner = -halfW + 18;

          // Retrieve divider positions
          let dPositions = config.dividerPositions || [];
          if (dPositions.length !== partitions) {
            dPositions = [];
            for (let i = 0; i < partitions; i++) {
              dPositions.push(Math.round((i + 1) * width / (partitions + 1)));
            }
          }

          // Dividers
          for (let i = 0; i < partitions; i++) {
            const dx = -halfW + dPositions[i];
            addBoard(18, bodyHeight - 36, depth - 10, dx, legHeight + bodyHeight / 2, 5, bodyMat, `Дотор босоо хуваалт ${i + 1}`, 'Хуваалт', { partitionIndex: i });
          }

          // Shelves
          if (shelves > 0) {
            const insideHeight = bodyHeight - 36;
            let shelfIdx = 0;
            const storedSecCounts: number[] | undefined = (config as any).sectionShelfCounts;
            const hasValidSecCounts = storedSecCounts && storedSecCounts.length === sections.length && storedSecCounts.reduce((a: number, b: number) => a + b, 0) === shelves;
            sections.forEach((sec, sIdx) => {
              const secDx = sec.centerX;
              const shelvesInSec = hasValidSecCounts ? storedSecCounts![sIdx] : (Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0));
              for (let i = 0; i < shelvesInSec; i++) {
                let sy: number;
                if (config.shelfPositions && config.shelfPositions.length === shelves) {
                  sy = legHeight + 18 + config.shelfPositions[shelfIdx];
                } else {
                  const step = insideHeight / (shelvesInSec + 1);
                  sy = legHeight + 18 + (i + 1) * step;
                }
                addBoard(sec.width - 4, 18, depth - 10, secDx, sy, 5, bodyMat, `Дунд тавиур ${shelfIdx + 1}`, 'Дээд тавиур', { shelfIndex: shelfIdx });
                shelfIdx++;
              }
            });
          }

          // Doors — support glass type
          if (doors > 0) {
            const isGlass = config.glassType && config.glassType !== 'none';
            const glassOpacity = config.glassType === 'frosted' ? 0.55 : 0.22;
            const glassColor = config.glassType === 'frosted' ? '#cce8f0' : '#b8daf0';
            const glassPaneMat = new THREE.MeshStandardMaterial({
              color: glassColor, transparent: true, opacity: glassOpacity,
              roughness: config.glassType === 'frosted' ? 0.7 : 0.05,
              metalness: 0.08, side: THREE.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1
            });

            if (sections.length > 1) {
              const numSections = sections.length;
              const panels = getCabinetFrontPanels(width, config);

              for (let j = 0; j < numSections; j++) {
                const sec = sections[j];
                const panel = panels[j];
                const dx = panel.centerX;

                let secDoors = 0;

                // Distribute doors across sections
                if (config.customDoors) {
                  const leftDoorVal = config.leftDoor !== undefined ? config.leftDoor : (doors === 1 || doors >= 2 ? 1 : 0);
                  const rightDoorVal = config.rightDoor !== undefined ? config.rightDoor : (doors >= 2 ? 1 : 0);
                  const leftDoorCount = typeof leftDoorVal === 'number' ? leftDoorVal : (leftDoorVal ? 1 : 0);
                  const rightDoorCount = typeof rightDoorVal === 'number' ? rightDoorVal : (rightDoorVal ? 1 : 0);

                  if (j === 0) {
                    secDoors = leftDoorCount;
                  } else if (j === numSections - 1) {
                    secDoors = rightDoorCount;
                  } else {
                    secDoors = 0;
                  }
                } else {
                  secDoors = Math.floor(doors / numSections) + (j < doors % numSections ? 1 : 0);
                }

                if (secDoors > 0) {
                  const defaultDoorW = (panel.width - 4 * (secDoors - 1)) / secDoors;
                  const doorW = config.doorWidth && config.customDoors ? Math.min(defaultDoorW, Number(config.doorWidth)) : defaultDoorW;
                  const doorH = config.doorHeight && config.customDoors ? Math.min(bodyHeight - 10, Number(config.doorHeight)) : bodyHeight - 10;
                  const doorY = legHeight + 5 + doorH / 2;

                  for (let i = 0; i < secDoors; i++) {
                    const doorX = dx - panel.width / 2 + defaultDoorW / 2 + i * (defaultDoorW + 4);
                    const isLeftHinged = secDoors > 1 ? (i < Math.ceil(secDoors / 2)) : (dx <= 0);
                    const doorUserData = {
                      id: `${mod.id}-section-${j}-door-${i}`,
                      isLeftHinged,
                      doorCenterX: doorX,
                      doorWidth: doorW - 4
                    };

                    if (isGlass) {
                      const fT = 40; // frame thickness mm
                      const fD = 18; // frame depth mm
                      // Top rail
                      addBoard(doorW - 4, fT, fD, doorX, doorY + doorH / 2 - fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Дээд тавиур', 'Хаалга', doorUserData);
                      // Bottom rail
                      addBoard(doorW - 4, fT, fD, doorX, doorY - doorH / 2 + fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Доод тавиур', 'Хаалга', doorUserData);
                      // Left stile
                      const leftFrame = addBoard(fT, doorH - 2 * fT, fD, doorX - doorW / 2 + fT / 2 + 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Зүүн туг', 'Хаалга', doorUserData);
                      // Right stile
                      const rightFrame = addBoard(fT, doorH - 2 * fT, fD, doorX + doorW / 2 - fT / 2 - 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Баруун туг', 'Хаалга', doorUserData);
                      // Glass pane
                      addBoard(doorW - 4 - 2 * fT, doorH - 2 * fT, 4, doorX, doorY, halfD + 9, glassPaneMat, 'Шилэн хаалга – Шил', 'Хаалга', doorUserData);

                      // Handle
                      if (handleType !== 'none') {
                        const hGeom = new THREE.CylinderGeometry(4, 4, 120, 8);
                        const hMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                        const handle = new THREE.Mesh(hGeom, hMat);
                        handle.rotation.x = Math.PI / 2;
                        handle.position.set(0, -doorH / 2 + 60, 12);
                        if (isLeftHinged) {
                          rightFrame.add(handle);
                        } else {
                          leftFrame.add(handle);
                        }
                      }
                    } else {
                      const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Хаалга хавтан', 'Хаалга', doorUserData);
                      if (handleType !== 'none') {
                        const handleGeom = new THREE.CylinderGeometry(4, 4, 120, 8);
                        const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                        const handle = new THREE.Mesh(handleGeom, handleMat);
                        handle.rotation.x = Math.PI / 2;
                        const handleSide = isLeftHinged ? 1 : -1;
                        handle.position.set(handleSide * ((doorW - 4) / 2 - 25), -doorH / 2 + 60, 12);
                        doorMesh.add(handle);
                      }
                    }
                  }
                }
              }
            } else {
              // Single section doors
              const doorW = (width - 10) / doors;
              for (let i = 0; i < doors; i++) {
                const doorX = -halfW + 5 + doorW / 2 + i * doorW;
                const doorH = bodyHeight - 10;
                const doorY = legHeight + 5 + doorH / 2;
                const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
                const doorUserData = {
                  id: `${mod.id}-door-${i}`,
                  isLeftHinged,
                  doorCenterX: doorX,
                  doorWidth: doorW - 4
                };

                if (isGlass) {
                  const fT = 40; // frame thickness mm
                  const fD = 18; // frame depth mm
                  // Top rail
                  addBoard(doorW - 4, fT, fD, doorX, doorY + doorH / 2 - fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Дээд тавиур', 'Хаалга', doorUserData);
                  // Bottom rail
                  addBoard(doorW - 4, fT, fD, doorX, doorY - doorH / 2 + fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Доод тавиур', 'Хаалга', doorUserData);
                  // Left stile
                  const leftFrame = addBoard(fT, doorH - 2 * fT, fD, doorX - doorW / 2 + fT / 2 + 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Зүүн туг', 'Хаалга', doorUserData);
                  // Right stile
                  const rightFrame = addBoard(fT, doorH - 2 * fT, fD, doorX + doorW / 2 - fT / 2 - 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Баруун туг', 'Хаалга', doorUserData);
                  // Glass pane
                  addBoard(doorW - 4 - 2 * fT, doorH - 2 * fT, 4, doorX, doorY, halfD + 9, glassPaneMat, 'Шилэн хаалга – Шил', 'Хаалга', doorUserData);

                  // Handle
                  if (handleType !== 'none') {
                    const hGeom = new THREE.CylinderGeometry(4, 4, 120, 8);
                    const hMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(hGeom, hMat);
                    handle.rotation.x = Math.PI / 2;
                    handle.position.set(0, -doorH / 2 + 60, 12);
                    if (isLeftHinged) {
                      rightFrame.add(handle);
                    } else {
                      leftFrame.add(handle);
                    }
                  }
                } else {
                  const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Шүүгээний хаалга', 'Хаалга', doorUserData);
                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 120, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    const handleSide = isLeftHinged ? 1 : -1;
                    handle.position.set(handleSide * ((doorW - 4) / 2 - 25), -doorH / 2 + 60, 12);
                    doorMesh.add(handle);
                  }
                }
              }
            }
          }
        } else if (mod.type === 'wardrobe') {
          // Wardrobe
          buildLegs();
          addBoard(18, bodyHeight, depth, -halfW + 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Зүүн)', 'Хажуу хана');
          addBoard(18, bodyHeight, depth, halfW - 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Дээд таг хавтан', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, legHeight + 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');
          addBoard(width, bodyHeight, 3, 0, legHeight + bodyHeight / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          const sections = getCabinetSections(width, config, 'wardrobe');
          const partitions = sections.length - 1;
          const leftInner = -halfW + 18;

          // Retrieve divider positions
          let dPositions = config.dividerPositions || [];
          if (dPositions.length !== partitions) {
            dPositions = [];
            for (let i = 0; i < partitions; i++) {
              dPositions.push(Math.round((i + 1) * width / (partitions + 1)));
            }
          }

          // Dividers
          for (let i = 0; i < partitions; i++) {
            const dx = -halfW + dPositions[i];
            addBoard(18, bodyHeight - 36, depth - 20, dx, legHeight + bodyHeight / 2, 10, bodyMat, `Дотор босоо хуваалт ${i + 1}`, 'Хуваалт', { partitionIndex: i });
          }

          // Shelves
          if (shelves > 0) {
            const insideHeight = bodyHeight - 36;
            let shelfIdx = 0;
            const storedSecCounts: number[] | undefined = (config as any).sectionShelfCounts;
            const hasValidSecCounts = storedSecCounts && storedSecCounts.length === sections.length && storedSecCounts.reduce((a: number, b: number) => a + b, 0) === shelves;
            sections.forEach((sec, sIdx) => {
              const secDx = sec.centerX;
              const shelvesInSec = hasValidSecCounts ? storedSecCounts![sIdx] : (Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0));
              for (let i = 0; i < shelvesInSec; i++) {
                let sy: number;
                if (config.shelfPositions && config.shelfPositions.length === shelves) {
                  sy = legHeight + 18 + config.shelfPositions[shelfIdx];
                } else {
                  const step = insideHeight / (shelvesInSec + 1);
                  sy = legHeight + 18 + (i + 1) * step;
                }
                addBoard(sec.width - 4, 18, depth - 25, secDx, sy, 10, bodyMat, `Хэвтээ тавиур`, 'Дээд тавиур', { shelfIndex: shelfIdx });
                shelfIdx++;
              }
            });
          }

          // Drawers (in the first section)
          const firstSec = sections[0];
          const drawerW = firstSec.width;
          const drawerX = firstSec.centerX;
          const drawerStackH = drawers * 220;

          if (drawers > 0) {
            for (let i = 0; i < drawers; i++) {
              const dy = legHeight + 18 + 110 + i * 220;
              const drawerMesh = addBoard(drawerW - 6, 210, 18, drawerX, dy, halfD - 9, doorMat, `Шургуулганы нүүр`, 'Шургуулга');

              if (handleType !== 'none') {
                const handleGeom = new THREE.CylinderGeometry(4, 4, Math.min(120, (drawerW - 6) * 0.4), 16);
                const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.rotation.z = Math.PI / 2;
                handle.position.set(0, 0, 12);
                drawerMesh.add(handle);
              }
            }
          }

          // Doors
          if (doors > 0) {
            const doorW = (width - 10) / doors;
            for (let i = 0; i < doors; i++) {
              const doorX = -halfW + 5 + doorW / 2 + i * doorW;
              let doorH = bodyHeight - 10;
              let doorY = legHeight + bodyHeight / 2;

              // If drawers stack is in first section, adjust door height
              if (drawers > 0 && partitions > 0 && i === 0) {
                doorH = bodyHeight - drawerStackH - 10;
                doorY = legHeight + drawerStackH + doorH / 2 + 5;
              }

              const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
              const doorMesh = addBoard(
                doorW - 4,
                doorH,
                18,
                doorX,
                doorY,
                halfD + 9,
                doorMat,
                `Шкафны нугастай хаалга`,
                'Хаалга',
                {
                  id: `${mod.id}-door-${i}`,
                  isLeftHinged,
                  doorCenterX: doorX,
                  doorWidth: doorW - 4
                }
              );

              // Handle
              if (handleType !== 'none') {
                const handleGeom = new THREE.CylinderGeometry(4, 4, 120, 8);
                const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.rotation.x = Math.PI / 2;
                const handleSide = isLeftHinged ? 1 : -1;
                handle.position.set(handleSide * ((doorW - 4) / 2 - 25), 0, 12);
                doorMesh.add(handle);
              }
            }
          }
        } else if (mod.type === 'kitchen_lower') {
          // Kitchen Lower Cabinet
          buildLegs();
          addBoard(18, bodyHeight, depth, -halfW + 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Гал тогооны хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, bodyHeight, depth, halfW - 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Гал тогооны хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, legHeight + 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');
          addBoard(width - 36, 18, 100, 0, height - 9, halfD - 50, bodyMat, 'Дээд холбоос хавтан (Урд)', 'Дээд тавиур');
          addBoard(width - 36, 18, 100, 0, height - 9, -halfD + 50, bodyMat, 'Дээд холбоос хавтан (Ар)', 'Дээд тавиур');
          addBoard(width, bodyHeight, 3, 0, legHeight + bodyHeight / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Render Countertop if active
          if (config.countertopType && config.countertopType !== 'none') {
            const ctMat = getCountertopMaterial(config.countertopType);
            const ctT = config.countertopThickness ?? 40;
            const isStone_kl = config.countertopType === 'stone';
            const ctHalf = ctT / 2;
            addBoard(
              width,
              ctT,
              depth + 25,
              0,
              height + ctHalf,
              12.5,
              ctMat,
              isStone_kl ? 'Чулуун тавцан (Гал тогоо)' : 'Модон тавцан (Гал тогоо)',
              'Дээд тавиур'
            );
          }

          // Sections Layout using getCabinetSections
          const sections = getCabinetSections(width, config, 'kitchen_lower');
          const partitionsCount = sections.length - 1;

          // Retrieve divider positions
          let dPositions = config.dividerPositions || [];
          if (dPositions.length !== partitionsCount) {
            dPositions = [];
            for (let i = 0; i < partitionsCount; i++) {
              dPositions.push(Math.round((i + 1) * width / (partitionsCount + 1)));
            }
          }

          // Dividers
          for (let i = 0; i < partitionsCount; i++) {
            const dx = -halfW + dPositions[i];
            addBoard(18, bodyHeight - 36, depth - 20, dx, legHeight + bodyHeight / 2, 0, bodyMat, `Дотор босоо хуваалт ${i + 1}`, 'Хуваалт', { partitionIndex: i });
          }

          // Shelves, Drawers & Doors
          const panels = getCabinetFrontPanels(width, config);
          const storedSecCounts: number[] | undefined = (config as any).sectionShelfCounts;
          const hasValidSecCounts = storedSecCounts && storedSecCounts.length === sections.length && storedSecCounts.reduce((a: number, b: number) => a + b, 0) === shelves;

          if (sections.length > 1) {
            const numSections = sections.length;
            let shelfIdx = 0;

            for (let j = 0; j < numSections; j++) {
              const sec = sections[j];
              const panel = panels[j];
              const dx = panel.centerX;

              let secDrawers = 0;
              let secDoors = 0;

              // Distribute drawers and doors across all sections
              if (drawers > 0) {
                const hasCustomDrawers = config.leftDrawers !== undefined || config.rightDrawers !== undefined || config.middleDrawers !== undefined;
                if (config.customDoors && hasCustomDrawers) {
                  if (j === 0) {
                    secDrawers = config.leftDrawers !== undefined ? Number(config.leftDrawers) : 0;
                  } else if (j === numSections - 1) {
                    secDrawers = config.rightDrawers !== undefined ? Number(config.rightDrawers) : 0;
                  } else {
                    secDrawers = config.middleDrawers !== undefined ? Number(config.middleDrawers) : 0;
                  }
                } else {
                  secDrawers = Math.floor(drawers / numSections) + (j < drawers % numSections ? 1 : 0);
                }
              }
              if (doors > 0) {
                const hasCustomDoors = config.leftDoor !== undefined || config.rightDoor !== undefined;
                if (config.customDoors && hasCustomDoors) {
                  const leftDoorVal = config.leftDoor !== undefined ? config.leftDoor : (doors === 1 || doors >= 2 ? 1 : 0);
                  const rightDoorVal = config.rightDoor !== undefined ? config.rightDoor : (doors >= 2 ? 1 : 0);
                  const leftDoorCount = typeof leftDoorVal === 'number' ? leftDoorVal : (leftDoorVal ? 1 : 0);
                  const rightDoorCount = typeof rightDoorVal === 'number' ? rightDoorVal : (rightDoorVal ? 1 : 0);

                  if (j === 0) {
                    secDoors = leftDoorCount;
                  } else if (j === numSections - 1) {
                    secDoors = rightDoorCount;
                  } else {
                    secDoors = 0;
                  }
                } else {
                  secDoors = Math.floor(doors / numSections) + (j < doors % numSections ? 1 : 0);
                }
              }

              const sectionH = bodyHeight - 10;
              const hasDrawersAndDoors = secDrawers > 0 && secDoors > 0;
              const drawerAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;
              const doorAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;

              if (secDrawers > 0) {
                // Top area for drawers if both exist, else full height
                const startY = hasDrawersAndDoors ? (legHeight + 5 + doorAreaH) : (legHeight + 5);
                const drH = drawerAreaH / secDrawers;
                for (let i = 0; i < secDrawers; i++) {
                  const dy = startY + drH / 2 + i * drH;
                  const drawerMesh = addBoard(panel.width, drH - 6, 18, dx, dy, halfD + 9, doorMat, `Шургуулганы нүүр ${i + 1}`, 'Шургуулга');

                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, Math.min(120, panel.width * 0.4), 16);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.z = Math.PI / 2;
                    handle.position.set(0, 0, 12);
                    drawerMesh.add(handle);
                  }
                }
              }

              if (secDoors > 0) {
                // Bottom area for doors if both exist, else full height
                const startY = legHeight + 5;
                const defaultDoorW = (panel.width - 4 * (secDoors - 1)) / secDoors;
                const doorW = config.doorWidth && config.customDoors ? Math.min(defaultDoorW, Number(config.doorWidth)) : defaultDoorW;
                const doorH = config.doorHeight && config.customDoors ? Math.min(doorAreaH, Number(config.doorHeight)) : doorAreaH;
                const doorY = startY + doorH / 2;

                for (let i = 0; i < secDoors; i++) {
                  const doorX = dx - panel.width / 2 + defaultDoorW / 2 + i * (defaultDoorW + 4);
                  const isLeftHinged = secDoors > 1 ? (i < Math.ceil(secDoors / 2)) : (dx <= 0);
                  const doorMesh = addBoard(
                    doorW - 4,
                    doorH,
                    18,
                    doorX,
                    doorY,
                    halfD + 9,
                    doorMat,
                    `Шүүгээний хаалга`,
                    'Хаалга',
                    {
                      id: `${mod.id}-section-${j}-door-${i}`,
                      isLeftHinged,
                      doorCenterX: doorX,
                      doorWidth: doorW - 4
                    }
                  );

                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    const handleSide = isLeftHinged ? 1 : -1;
                    handle.position.set(handleSide * ((doorW - 4) / 2 - 25), doorH / 2 - 60, 12);
                    doorMesh.add(handle);
                  }
                }
              }

              // Suppress shelves if it has drawers only, keep if open/door/split
              const hasDrawersOnly = secDrawers > 0 && secDoors === 0;
              const shelvesInSec = hasValidSecCounts 
                ? storedSecCounts![j] 
                : (Math.floor(shelves / sections.length) + (j < shelves % sections.length ? 1 : 0));
              if (shelves > 0 && !hasDrawersOnly) {
                const insideH = hasDrawersAndDoors ? (doorAreaH - 36) : (bodyHeight - 36);
                const baseOffset = hasDrawersAndDoors ? legHeight : legHeight;
                for (let i = 0; i < shelvesInSec; i++) {
                  let sy: number;
                  if (config.shelfPositions && config.shelfPositions.length === shelves) {
                    sy = baseOffset + 18 + config.shelfPositions[shelfIdx];
                  } else {
                    const step = insideH / (shelvesInSec + 1);
                    sy = baseOffset + 18 + (i + 1) * step;
                  }
                  addBoard(sec.width - 2, 18, depth - 30, sec.centerX, sy, 0, bodyMat, `Дотор тавиур (Секц ${j+1}) ${i + 1}`, 'Дээд тавиур');
                  shelfIdx++;
                }
              } else {
                shelfIdx += shelvesInSec;
              }
            }
          } else {
            if (shelves > 0 && drawers === 0) {
              for (let i = 0; i < shelves; i++) {
                const sy = getShelfY(i, shelves, bodyHeight - 36, legHeight, config);
                addBoard(width - 36, 18, depth - 30, 0, sy, 0, bodyMat, `Дотор тавиур ${i + 1}`, 'Дээд тавиур', { shelfIndex: i });
              }
            }
            if (drawers > 0 && doors === 0) {
              const drH = (bodyHeight - 10) / drawers;
              for (let i = 0; i < drawers; i++) {
                const dy = legHeight + drH / 2 + 5 + i * drH;
                const drawerMesh = addBoard(width - 10, drH - 6, 18, 0, dy, halfD + 9, doorMat, `Шургуулганы нүүр ${i + 1}`, 'Шургуулга');

                // Handle
                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, Math.min(120, width * 0.4), 16);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.z = Math.PI / 2;
                  handle.position.set(0, 0, 12);
                  drawerMesh.add(handle);
                }
              }
            } else if (doors > 0 && drawers === 0) {
              if (config.customDoors) {
                const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
                const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
                const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
                const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
                const doorH = config.doorHeight ? Number(config.doorHeight) : (bodyHeight - 10);
                const doorY = legHeight + 5 + doorH / 2;

                if (hasLeftDoor) {
                  const doorX = width >= 800 ? -halfW + 5 + customDoorWidth / 2 : 0;
                  const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга (Зүүн)`, 'Хаалга', {
                    id: `${mod.id}-door-left`,
                    isLeftHinged: true,
                    doorCenterX: doorX,
                    doorWidth: customDoorWidth - 4
                  });
                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    handle.position.set((customDoorWidth - 4) / 2 - 25, doorH / 2 - 60, 12);
                    doorMesh.add(handle);
                  }
                }
                if (hasRightDoor) {
                  const doorX = width >= 800 ? halfW - 5 - customDoorWidth / 2 : 0;
                  const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга (Баруун)`, 'Хаалга', {
                    id: `${mod.id}-door-right`,
                    isLeftHinged: false,
                    doorCenterX: doorX,
                    doorWidth: customDoorWidth - 4
                  });
                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    handle.position.set(-((customDoorWidth - 4) / 2 - 25), doorH / 2 - 60, 12);
                    doorMesh.add(handle);
                  }
                }
              } else {
                const doorW = (width - 10) / doors;
                for (let i = 0; i < doors; i++) {
                  const doorX = -halfW + 5 + doorW / 2 + i * doorW;
                  const doorH = bodyHeight - 10;
                  const doorY = legHeight + bodyHeight / 2;
                  const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
                  const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга`, 'Хаалга', {
                    id: `${mod.id}-door-${i}`,
                    isLeftHinged,
                    doorCenterX: doorX,
                    doorWidth: doorW - 4
                  });

                  // Handle
                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    const handleSide = isLeftHinged ? 1 : -1;
                    handle.position.set(handleSide * ((doorW - 4) / 2 - 25), doorH / 2 - 60, 12);
                    doorMesh.add(handle);
                  }
                }
              }
            } else if (drawers > 0 && doors > 0) {
              const singleDrawerH = 150;

              // Render drawers stacked vertically at the top
              for (let j = 0; j < drawers; j++) {
                const py = height - (drawers - j - 0.5) * singleDrawerH;
                const drawerMesh = addBoard(width - 10, singleDrawerH - 10, 18, 0, py, halfD + 9, doorMat, `Шургуулганы нүүр ${j + 1}`, 'Шургуулга');

                // Handle
                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, Math.min(120, width * 0.4), 16);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.z = Math.PI / 2;
                  handle.position.set(0, 0, 12);
                  drawerMesh.add(handle);
                }
              }

              // Render doors below the drawers stack
              if (config.customDoors) {
                const doorH = config.doorHeight ? Number(config.doorHeight) : (bodyHeight - drawers * singleDrawerH - 10);
                const doorY = legHeight + doorH / 2 + 5;
                const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
                const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
                const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
                const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;

                if (hasLeftDoor) {
                  const doorX = width >= 800 ? -halfW + 5 + customDoorWidth / 2 : 0;
                  const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга (Зүүн)`, 'Хаалга', {
                    id: `${mod.id}-door-left`,
                    isLeftHinged: true,
                    doorCenterX: doorX,
                    doorWidth: customDoorWidth - 4
                  });
                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    handle.position.set((customDoorWidth - 4) / 2 - 25, doorH / 2 - 40, 12);
                    doorMesh.add(handle);
                  }
                }
                if (hasRightDoor) {
                  const doorX = width >= 800 ? halfW - 5 - customDoorWidth / 2 : 0;
                  const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга (Баруун)`, 'Хаалга', {
                    id: `${mod.id}-door-right`,
                    isLeftHinged: false,
                    doorCenterX: doorX,
                    doorWidth: customDoorWidth - 4
                  });
                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    handle.position.set(-((customDoorWidth - 4) / 2 - 25), doorH / 2 - 40, 12);
                    doorMesh.add(handle);
                  }
                }
              } else {
                const doorH = bodyHeight - drawers * singleDrawerH - 10;
                const doorY = legHeight + doorH / 2 + 5;
                const doorW = (width - 10) / doors;

                for (let i = 0; i < doors; i++) {
                  const doorX = -halfW + 5 + doorW / 2 + i * doorW;
                  const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
                  const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга`, 'Хаалга', {
                    id: `${mod.id}-door-${i}`,
                    isLeftHinged,
                    doorCenterX: doorX,
                    doorWidth: doorW - 4
                  });

                  // Handle
                  if (handleType !== 'none') {
                    const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                    const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                    const handle = new THREE.Mesh(handleGeom, handleMat);
                    handle.rotation.x = Math.PI / 2;
                    const handleSide = isLeftHinged ? 1 : -1;
                    handle.position.set(handleSide * ((doorW - 4) / 2 - 25), doorH / 2 - 40, 12);
                    doorMesh.add(handle);
                  }
                }
              }
            }
          }
        } else if (mod.type === 'corner_lower' || mod.type === 'corner_upper') {
          // ── Corner Cabinet — L-shaped blind corner ───────────────────────────
          // Top view:
          //   -hs       0      +hs
          // -hs ┌──────────────┐  ← back wall (full width)
          //     │ BACK ARM     │  ← blind storage (closed right side)
          //  0  ├──────┐       │  ← front arm right wall at x=0
          //     │ DOOR │       │
          //     │ DOOR │ SOLID │  ← front arm has doors; back arm right = solid panel
          // +hs └──────┘       │
          //            └───────┘  ← right outer wall (full depth)
          const isLower = mod.type === 'corner_lower';
          const S = width;   // S × S square footprint (e.g. 900mm)
          const hs = S / 2;
          const P = 18;
          const legH = (isLower && hasLegs) ? 100 : 0;
          const bodyH = height - legH;
          const midY = legH + bodyH / 2;
          const topY = legH + bodyH - P / 2;
          const botY = legH + P / 2;

          // ── PLINTH / LEGS (Closed 10cm Plinth / Socle or Cylinder columns) ─────────────────────────
          if (isLower && hasLegs) {
            const legStyle = config.legStyle || 'plinth';
            if (legStyle === 'cylinder') {
              const legGeo = new THREE.CylinderGeometry(20, 12, 100, 16);
              const legM = new THREE.MeshStandardMaterial({
                color: '#111827',
                metalness: 0.5,
                roughness: 0.5,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
              });
              const legPositions = [
                [-hs + 40, 50, -hs + 40],
                [-hs + 40, 50, hs - 40],
                [-40, 50, hs - 40],
                [-40, 50, 40],
                [hs - 40, 50, 40],
                [hs - 40, 50, -hs + 40]
              ];
              legPositions.forEach(([lx, ly, lz]) => {
                const leg = new THREE.Mesh(legGeo, legM);
                leg.position.set(lx, ly, lz);
                leg.castShadow = true;
                leg.userData = {
                  category: 'leg',
                  baseX: lx,
                  baseY: ly,
                  baseZ: lz,
                  expX: lx * 0.1,
                  expY: -35,
                  expZ: lz * 0.1
                };
                moduleGroup.add(leg);
              });
            } else {
              // Left plinth board
              const lpW = 18;
              const lpD = S - 38;
              const lpGeo = new THREE.BoxGeometry(lpW, 100, lpD);
              const lp = new THREE.Mesh(lpGeo, bodyMat);
              lp.castShadow = true;
              lp.receiveShadow = true;
              const lpX = -hs + 9;
              const lpZ = 19;
              lp.position.set(lpX, 50, lpZ);
              lp.userData = { category: 'leg', baseX: lpX, baseY: 50, baseZ: lpZ, expX: -15, expY: -35, expZ: 0 };
              moduleGroup.add(lp);

              // Back plinth board
              const bpW = S;
              const bpD = 18;
              const bpGeo = new THREE.BoxGeometry(bpW, 100, bpD);
              const bp = new THREE.Mesh(bpGeo, bodyMat);
              bp.castShadow = true;
              bp.receiveShadow = true;
              const bpX = 0;
              const bpZ = -hs + 29;
              bp.position.set(bpX, 50, bpZ);
              bp.userData = { category: 'leg', baseX: bpX, baseY: 50, baseZ: bpZ, expX: 0, expY: -35, expZ: -15 };
              moduleGroup.add(bp);

              // Right plinth board
              const rpW = 18;
              const rpD = hs - 38;
              const rpGeo = new THREE.BoxGeometry(rpW, 100, rpD);
              const rp = new THREE.Mesh(rpGeo, bodyMat);
              rp.castShadow = true;
              rp.receiveShadow = true;
              const rpX = hs - 9;
              const rpZ = -hs / 2 + 19;
              rp.position.set(rpX, 50, rpZ);
              rp.userData = { category: 'leg', baseX: rpX, baseY: 50, baseZ: rpZ, expX: 15, expY: -35, expZ: 0 };
              moduleGroup.add(rp);

              // Back arm front plinth board
              const bafpW = hs - 18;
              const bafpD = 18;
              const bafpGeo = new THREE.BoxGeometry(bafpW, 100, bafpD);
              const bafp = new THREE.Mesh(bafpGeo, bodyMat);
              bafp.castShadow = true;
              bafp.receiveShadow = true;
              const bafpX = hs / 2 + 9;
              const bafpZ = -9;
              bafp.position.set(bafpX, 50, bafpZ);
              bafp.userData = { category: 'leg', baseX: bafpX, baseY: 50, baseZ: bafpZ, expX: 0, expY: -35, expZ: 15 };
              moduleGroup.add(bafp);

              // Front arm right plinth board
              const farpW = 18;
              const farpD = hs - 9;
              const farpGeo = new THREE.BoxGeometry(farpW, 100, farpD);
              const farp = new THREE.Mesh(farpGeo, bodyMat);
              farp.castShadow = true;
              farp.receiveShadow = true;
              const farpX = -9;
              const farpZ = (hs - 9) / 2;
              farp.position.set(farpX, 50, farpZ);
              farp.userData = { category: 'leg', baseX: farpX, baseY: 50, baseZ: farpZ, expX: 15, expY: -35, expZ: 0 };
              moduleGroup.add(farp);

              // Front arm front plinth board
              const fafpW = hs - 18;
              const fafpD = 18;
              const fafpGeo = new THREE.BoxGeometry(fafpW, 100, fafpD);
              const fafp = new THREE.Mesh(fafpGeo, bodyMat);
              fafp.castShadow = true;
              fafp.receiveShadow = true;
              const fafpX = -hs / 2 - 9;
              const fafpZ = hs - 9;
              fafp.position.set(fafpX, 50, fafpZ);
              fafp.userData = { category: 'leg', baseX: fafpX, baseY: 50, baseZ: fafpZ, expX: 0, expY: -35, expZ: 15 };
              moduleGroup.add(fafp);
            }
          }

          // ── OUTER SHELL PANELS ───────────────────────────────────────────────
          // Left outer wall (x = -hs): full depth z from -hs to +hs
          addBoard(P, bodyH, S, -hs+P/2, midY, 0, bodyMat, 'Зүүн гадна хана', 'Хажуу хана');
          // Right outer wall (x = +hs): full depth z from -hs to +hs (closed — connects to side run)
          addBoard(P, bodyH, S, hs-P/2, midY, 0, bodyMat, 'Баруун гадна хана', 'Хажуу хана');
          // Back outer wall (z = -hs): full width
          addBoard(S-2*P, bodyH, P, 0, midY, -hs+P/2, bodyMat, 'Ар гадна хана', 'Ар тал');
          // Front outer wall of BACK ARM (z = 0, from x = 0 to x = +hs): closes the back arm
          addBoard(hs-P, bodyH, P, hs/2, midY, -P/2, bodyMat, 'Ар тал – Урд хана', 'Хуваалт');
          // Right inner wall of FRONT ARM (x = 0, from z = 0 to z = +hs)
          addBoard(P, bodyH, hs, -P/2, midY, hs/2, bodyMat, 'Урд тал – Баруун хана', 'Хажуу хана');

          // ── TOP PANELS (L-shaped) ─────────────────────────────────────────────
          // Back arm top (full width, z from -hs to 0)
          addBoard(S-2*P, P, hs-P, 0, topY, -hs/2+P/2, bodyMat, 'Дээд таг – Ар', 'Дээд тавиур');
          // Front arm top (x from -hs to 0, z from 0 to +hs)
          addBoard(hs-P, P, hs-P, -hs/2+P/2, topY, hs/2, bodyMat, 'Дээд таг – Урд', 'Дээд тавиур');
          // Back arm rear connector (like kitchen_lower connector strip)
          addBoard(S-2*P, P, 80, 0, height-P/2, -hs+40, bodyMat, 'Дээд холбоос – Ар', 'Дээд тавиур');

          // ── BOTTOM PANELS ─────────────────────────────────────────────────────
          addBoard(S-2*P, P, hs-P, 0, botY, -hs/2+P/2, bodyMat, 'Доод суурь – Ар', 'Доод тавиур');
          addBoard(hs-P, P, hs-P, -hs/2+P/2, botY, hs/2, bodyMat, 'Доод суурь – Урд', 'Доод тавиур');

          // ── HDF BACK PANEL ────────────────────────────────────────────────────
          addBoard(S-2*P, bodyH, 3, 0, midY, -hs+1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // ── DOORS — only on FRONT ARM +Z face (x from -hs to 0) ─────────────
          const cornerDoors = (config.doors !== undefined && Number(config.doors) !== 0) ? Number(config.doors) : 2;
          if (cornerDoors > 0) {
            const dH = bodyH - 10;
            const armW = hs - 2*P; // usable width of front arm opening
            const dW = cornerDoors > 1 ? (armW - 4) / cornerDoors : armW - 4;
            for (let i = 0; i < Math.min(cornerDoors, 2); i++) {
              const doorX = -hs + P + dW/2 + i * (dW + 4);
              const isLeftHinged = cornerDoors > 1 ? (i < Math.ceil(cornerDoors / 2)) : (doorX <= 0);
              const doorMesh = addBoard(dW, dH, P, doorX, midY, hs + P/2, doorMat, `Хаалга ${i+1}`, 'Хаалга', {
                id: `${mod.id}-door-${i}`,
                isLeftHinged,
                doorCenterX: doorX,
                doorWidth: dW
              });
              if (handleType !== 'none') {
                const h = new THREE.Mesh(
                  new THREE.CylinderGeometry(4, 4, 60, 8),
                  new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 })
                );
                h.rotation.x = Math.PI / 2;
                const side = isLeftHinged ? 1 : -1;
                h.position.set(side * (dW/2 - 22), isLower ? dH/2 - 50 : -dH/2 + 30, 10);
                doorMesh.add(h);
              }
            }
          }

          // ── COUNTERTOP (L-shaped, two pieces) ────────────────────────────────
          if (isLower && config.countertopType && config.countertopType !== 'none') {
            const ctMat = getCountertopMaterial(config.countertopType);
            const ctT = config.countertopThickness ?? 40;
            const ctHalf = ctT / 2;
            // Back arm countertop (full width, z from -hs to 0)
            addBoard(S, ctT, hs+25, 0, height+ctHalf, -hs/2+12.5, ctMat, 'Буланд тавцан – Ар', 'Дээд тавиур');
            // Front arm countertop (x from -hs to 0, z from 0 to +hs)
            addBoard(hs, ctT, hs+25, -hs/2, height+ctHalf, hs/2+12.5, ctMat, 'Буланд тавцан – Урд', 'Дээд тавиур');
          }

        } else if (mod.type === 'kitchen_upper') {
          // Upper Kitchen Cabinet (No legs, sits high)
          addBoard(18, height, depth, -halfW + 9, height / 2, 0, bodyMat, 'Дээд шүүгээний хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, height, depth, halfW - 9, height / 2, 0, bodyMat, 'Дээд шүүгээний хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Дээд таг хавтан', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');
          addBoard(width, height, 3, 0, height / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Sections Layout using getCabinetSections
          const sections = getCabinetSections(width, config, 'kitchen_upper');
          const partitionsCount = sections.length - 1;

          // Retrieve divider positions
          let dPositions = config.dividerPositions || [];
          if (dPositions.length !== partitionsCount) {
            dPositions = [];
            for (let i = 0; i < partitionsCount; i++) {
              dPositions.push(Math.round((i + 1) * width / (partitionsCount + 1)));
            }
          }

          // Dividers
          for (let i = 0; i < partitionsCount; i++) {
            const dx = -halfW + dPositions[i];
            addBoard(18, height - 36, depth - 20, dx, height / 2, 0, bodyMat, `Дотор босоо хуваалт ${i + 1}`, 'Хуваалт', { partitionIndex: i });
          }

          // Shelves
          if (shelves > 0) {
            if (partitionsCount > 0) {
              const storedSecCounts: number[] | undefined = (config as any).sectionShelfCounts;
              const hasValidSecCounts = storedSecCounts && storedSecCounts.length === sections.length && storedSecCounts.reduce((a: number, b: number) => a + b, 0) === shelves;
              let shelfIdx = 0;
              sections.forEach((sec, sIdx) => {
                const shelvesInSec = hasValidSecCounts ? storedSecCounts![sIdx] : (Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0));
                for (let i = 0; i < shelvesInSec; i++) {
                  let sy: number;
                  if (config.shelfPositions && config.shelfPositions.length === shelves) {
                    sy = 18 + config.shelfPositions[shelfIdx];
                  } else {
                    const step = (height - 36) / (shelvesInSec + 1);
                    sy = 18 + (i + 1) * step;
                  }
                  addBoard(sec.width - 2, 18, depth - 20, sec.centerX, sy, 5, bodyMat, `Дотор тавиур (Секц ${sIdx+1}) ${i + 1}`, 'Дээд тавиур');
                  shelfIdx++;
                }
              });
            } else {
              for (let i = 0; i < shelves; i++) {
                const sy = getShelfY(i, shelves, height - 36, 0, config);
                addBoard(width - 36, 18, depth - 20, 0, sy, 5, bodyMat, `Дотор тавиур ${i + 1}`, 'Дээд тавиур', { shelfIndex: i });
              }
            }
          }

          // Doors — support glass type
          if (doors > 0) {
            const isGlass = config.glassType && config.glassType !== 'none';
            const glassOpacity = config.glassType === 'frosted' ? 0.55 : 0.22;
            const glassColor = config.glassType === 'frosted' ? '#cce8f0' : '#b8daf0';
            const glassPaneMat = new THREE.MeshStandardMaterial({
              color: glassColor, transparent: true, opacity: glassOpacity,
              roughness: config.glassType === 'frosted' ? 0.7 : 0.05,
              metalness: 0.08, side: THREE.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1
            });

            if (sections.length > 1) {
              const numSections = sections.length;
              const panels = getCabinetFrontPanels(width, config);

              for (let j = 0; j < numSections; j++) {
                const sec = sections[j];
                const panel = panels[j];
                const dx = panel.centerX;

                let secDoors = 0;

                // Distribute doors across sections
                if (config.customDoors) {
                  const leftDoorVal = config.leftDoor !== undefined ? config.leftDoor : (doors === 1 || doors >= 2 ? 1 : 0);
                  const rightDoorVal = config.rightDoor !== undefined ? config.rightDoor : (doors >= 2 ? 1 : 0);
                  const leftDoorCount = typeof leftDoorVal === 'number' ? leftDoorVal : (leftDoorVal ? 1 : 0);
                  const rightDoorCount = typeof rightDoorVal === 'number' ? rightDoorVal : (rightDoorVal ? 1 : 0);

                  if (j === 0) {
                    secDoors = leftDoorCount;
                  } else if (j === numSections - 1) {
                    secDoors = rightDoorCount;
                  } else {
                    secDoors = 0;
                  }
                } else {
                  secDoors = Math.floor(doors / numSections) + (j < doors % numSections ? 1 : 0);
                }

                if (secDoors > 0) {
                  const defaultDoorW = (panel.width - 4 * (secDoors - 1)) / secDoors;
                  const doorW = config.doorWidth && config.customDoors ? Math.min(defaultDoorW, Number(config.doorWidth)) : defaultDoorW;
                  const doorH = config.doorHeight && config.customDoors ? Math.min(height - 10, Number(config.doorHeight)) : (height - 10);
                  const doorY = 5 + doorH / 2;

                  for (let i = 0; i < secDoors; i++) {
                    const doorX = dx - panel.width / 2 + doorW / 2 + i * (doorW + 4);
                    const isLeftHinged = secDoors > 1 ? (i < Math.ceil(secDoors / 2)) : (dx <= 0);
                    const doorUserData = {
                      id: `${mod.id}-section-${j}-door-${i}`,
                      isLeftHinged,
                      doorCenterX: doorX,
                      doorWidth: doorW - 4
                    };

                    if (isGlass) {
                      const fT = 40; // frame thickness mm
                      const fD = 18; // frame depth mm
                      // Top rail
                      addBoard(doorW - 4, fT, fD, doorX, doorY + doorH / 2 - fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Дээд тавиур', 'Хаалга', doorUserData);
                      // Bottom rail
                      addBoard(doorW - 4, fT, fD, doorX, doorY - doorH / 2 + fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Доод тавиур', 'Хаалга', doorUserData);
                      // Left stile
                      const leftFrame = addBoard(fT, doorH - 2 * fT, fD, doorX - doorW / 2 + fT / 2 + 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Зүүн туг', 'Хаалга', doorUserData);
                      // Right stile
                      const rightFrame = addBoard(fT, doorH - 2 * fT, fD, doorX + doorW / 2 - fT / 2 - 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Баруун туг', 'Хаалга', doorUserData);
                      // Glass pane
                      addBoard(doorW - 4 - 2 * fT, doorH - 2 * fT, 4, doorX, doorY, halfD + 9, glassPaneMat, 'Шилэн хаалга – Шил', 'Хаалга', doorUserData);

                      // Handle
                      if (handleType !== 'none') {
                        const hGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                        const hMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                        const handle = new THREE.Mesh(hGeom, hMat);
                        handle.rotation.x = Math.PI / 2;
                        handle.position.set(0, -doorH / 2 + 30, 12);
                        if (isLeftHinged) {
                          rightFrame.add(handle);
                        } else {
                          leftFrame.add(handle);
                        }
                      }
                    } else {
                      const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Дээд шүүгээний хаалга', 'Хаалга', doorUserData);
                      if (handleType !== 'none') {
                        const handleGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                        const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                        const handle = new THREE.Mesh(handleGeom, handleMat);
                        handle.rotation.x = Math.PI / 2;
                        const handleSide = isLeftHinged ? 1 : -1;
                        handle.position.set(handleSide * ((doorW - 4) / 2 - 25), -doorH / 2 + 30, 12);
                        doorMesh.add(handle);
                      }
                    }
                  }
                }
              }
            } else {
              if (config.customDoors) {
                // Get numeric door counts per side
                const leftDoorVal = config.leftDoor !== undefined ? config.leftDoor : (doors === 1 || doors >= 2 ? 1 : 0);
                const rightDoorVal = config.rightDoor !== undefined ? config.rightDoor : (doors >= 2 ? 1 : 0);
                const leftDoorCount = typeof leftDoorVal === 'number' ? leftDoorVal : (leftDoorVal ? 1 : 0);
                const rightDoorCount = typeof rightDoorVal === 'number' ? rightDoorVal : (rightDoorVal ? 1 : 0);
                const totalDoors = leftDoorCount + rightDoorCount;
                // Always auto-calculate door height — never constrain by slider value
                const doorH = height - 10;
                const doorY = 5 + doorH / 2;

                // Render doors per side using even split within each half
                const renderDoorsForSide = (count: number, isLeftSide: boolean) => {
                  if (count <= 0) return;
                  // Panel width for this side: half of cabinet if both sides have doors, else full width
                  const panelW = totalDoors > 0 && leftDoorCount > 0 && rightDoorCount > 0
                    ? (width - 10) / 2
                    : (width - 10);
                  const panelStartX = isLeftSide
                    ? -halfW + 5
                    : (leftDoorCount > 0 ? 0 : -halfW + 5);
                  const defaultSingleW = (panelW - 4 * (count - 1)) / count;
                  const doorW = config.doorWidth && config.customDoors ? Math.min(defaultSingleW, Number(config.doorWidth)) : defaultSingleW;
                  const doorH = config.doorHeight && config.customDoors ? Math.min(height - 10, Number(config.doorHeight)) : (height - 10);
                  const doorY = 5 + doorH / 2;

                  for (let i = 0; i < count; i++) {
                    const doorX = panelStartX + defaultSingleW / 2 + i * (defaultSingleW + 4);
                    const isLeftHinged = count > 1 ? (i < Math.ceil(count / 2)) : isLeftSide;
                    const handleSide = isLeftHinged ? 1 : -1;
                    const upperDoorUserData = {
                      id: `${mod.id}-door-${isLeftSide ? 'left' : 'right'}-${i}`,
                      isLeftHinged,
                      doorCenterX: doorX,
                      doorWidth: doorW - 4
                    };

                    if (isGlass) {
                      const fT = 40;
                      const fD = 18;
                      addBoard(defaultSingleW - 4, fT, fD, doorX, doorY + doorH / 2 - fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Дээд тавиур', 'Хаалга', upperDoorUserData);
                      addBoard(defaultSingleW - 4, fT, fD, doorX, doorY - doorH / 2 + fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Доод тавиур', 'Хаалга', upperDoorUserData);
                      const leftFrame = addBoard(fT, doorH - 2 * fT, fD, doorX - defaultSingleW / 2 + fT / 2 + 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Зүүн туг', 'Хаалга', upperDoorUserData);
                      const rightFrame = addBoard(fT, doorH - 2 * fT, fD, doorX + defaultSingleW / 2 - fT / 2 - 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Баруун туг', 'Хаалга', upperDoorUserData);
                      addBoard(defaultSingleW - 4 - 2 * fT, doorH - 2 * fT, 4, doorX, doorY, halfD + 9, glassPaneMat, 'Шилэн хаалга – Шил', 'Хаалга', upperDoorUserData);
                      if (handleType !== 'none') {
                        const hGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                        const hMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                        const handle = new THREE.Mesh(hGeom, hMat);
                        handle.rotation.x = Math.PI / 2;
                        handle.position.set(0, -doorH / 2 + 30, 12);
                        if (isLeftHinged) { rightFrame.add(handle); } else { leftFrame.add(handle); }
                      }
                    } else {
                      const doorMesh = addBoard(defaultSingleW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Дээд шүүгээний хаалга', 'Хаалга', upperDoorUserData);
                      if (handleType !== 'none') {
                        const handleGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                        const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                        const handle = new THREE.Mesh(handleGeom, handleMat);
                        handle.rotation.x = Math.PI / 2;
                        handle.position.set(handleSide * ((defaultSingleW - 4) / 2 - 25), -doorH / 2 + 30, 12);
                        doorMesh.add(handle);
                      }
                    }
                  }
                };

                renderDoorsForSide(leftDoorCount, true);
                renderDoorsForSide(rightDoorCount, false);
              } else {
                const defaultDoorW = (width - 10) / doors;
                const doorW = config.doorWidth && config.customDoors ? Math.min(defaultDoorW, Number(config.doorWidth)) : defaultDoorW;
                const doorH = config.doorHeight && config.customDoors ? Math.min(height - 10, Number(config.doorHeight)) : (height - 10);
                const doorY = 5 + doorH / 2;
                for (let i = 0; i < doors; i++) {
                  const doorX = -halfW + 5 + defaultDoorW / 2 + i * defaultDoorW;
                  const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
                  const doorUserData = {
                    id: `${mod.id}-door-${i}`,
                    isLeftHinged,
                    doorCenterX: doorX,
                    doorWidth: doorW - 4
                  };

                  if (isGlass) {
                    const fT = 40; // frame thickness mm
                    const fD = 18; // frame depth mm
                    // Top rail
                    addBoard(doorW - 4, fT, fD, doorX, doorY + doorH / 2 - fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Дээд тавиур', 'Хаалга', doorUserData);
                    // Bottom rail
                    addBoard(doorW - 4, fT, fD, doorX, doorY - doorH / 2 + fT / 2, halfD + 9, doorMat, 'Шилэн хаалга – Доод тавиур', 'Хаалга', doorUserData);
                    // Left stile
                    const leftFrame = addBoard(fT, doorH - 2 * fT, fD, doorX - doorW / 2 + fT / 2 + 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Зүүн туг', 'Хаалга', doorUserData);
                    // Right stile
                    const rightFrame = addBoard(fT, doorH - 2 * fT, fD, doorX + doorW / 2 - fT / 2 - 2, doorY, halfD + 9, doorMat, 'Шилэн хаалга – Баруун туг', 'Хаалга', doorUserData);
                    // Glass pane
                    addBoard(doorW - 4 - 2 * fT, doorH - 2 * fT, 4, doorX, doorY, halfD + 9, glassPaneMat, 'Шилэн хаалга – Шил', 'Хаалга', doorUserData);

                    // Handle
                    if (handleType !== 'none') {
                      const hGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                      const hMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                      const handle = new THREE.Mesh(hGeom, hMat);
                      handle.rotation.x = Math.PI / 2;
                      handle.position.set(0, -doorH / 2 + 30, 12);
                      if (isLeftHinged) {
                        rightFrame.add(handle);
                      } else {
                        leftFrame.add(handle);
                      }
                    }
                  } else {
                    const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Дээд шүүгээний хаалга', 'Хаалга', doorUserData);
                    if (handleType !== 'none') {
                      const handleGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                      const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                      const handle = new THREE.Mesh(handleGeom, handleMat);
                      handle.rotation.x = Math.PI / 2;
                      const handleSide = isLeftHinged ? 1 : -1;
                      handle.position.set(handleSide * ((doorW - 4) / 2 - 25), -doorH / 2 + 30, 12);
                      doorMesh.add(handle);
                    }
                  }
                }
              }
            }
          }
        } else if (mod.type === 'cooktop') {
          // Cooktop base stove cabinet
          buildLegs();
          addBoard(18, bodyHeight, depth, -halfW + 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Зуухны их биеийн хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, bodyHeight, depth, halfW - 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Зуухны их биеийн хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, legHeight + 9, 0, bodyMat, 'Зуухны суурь хавтан', 'Доод тавиур');
          addBoard(width - 36, 18, 100, 0, height - 9, halfD - 50, bodyMat, 'Хөндлөн холбоос хавтан (Урд)', 'Дээд тавиур');
          addBoard(width - 36, 18, 100, 0, height - 9, -halfD + 50, bodyMat, 'Хөндлөн холбоос хавтан (Ар)', 'Дээд тавиур');
          addBoard(width, bodyHeight, 3, 0, legHeight + bodyHeight / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Render Countertop if active
          const hasCountertop = config.countertopType && config.countertopType !== 'none';
          const ctT_cooktop = config.countertopThickness ?? 40;
          if (hasCountertop) {
            const ctMat = getCountertopMaterial(config.countertopType);
            const isStone_ck = config.countertopType === 'stone';
            addBoard(
              width,
              ctT_cooktop,
              depth + 25,
              0,
              height + ctT_cooktop / 2,
              12.5,
              ctMat,
              isStone_ck ? 'Чулуун тавцан (Плитк)' : 'Модон тавцан (Плитк)',
              'Дээд тавиур'
            );
          }

          // Glossy black glass Cooktop Plate
          const cW = config.cooktopWidth ?? width;
          const cD = config.cooktopDepth ?? (depth + 20);
          
          const maxOffsetX = Math.max(0, (width - cW) / 2);
          const xOffset = Math.max(-maxOffsetX, Math.min(maxOffsetX, config.cooktopXOffset ?? 0));
          
          const defaultZ = hasCountertop ? 12.5 : 0;
          const maxOffsetZ = Math.max(0, (depth - cD) / 2);
          const zOffset = defaultZ + Math.max(-maxOffsetZ, Math.min(maxOffsetZ, config.cooktopZOffset ?? 0));

          const cooktopPlateY = hasCountertop ? (height + ctT_cooktop + 5) : (height + 5);
          const cooktopPlate = addBoard(
            cW,
            10,
            cD,
            xOffset,
            cooktopPlateY,
            zOffset,
            new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.1, metalness: 0.8 }),
            'Шилэн плитк',
            'Дээд тавиур'
          );
          
          // Draw auto-proportioned burners on the cooktop plate
          const bCount = config.burnerCount ?? 4;
          const clamped = Math.min(cW * 0.15, cD * 0.15); // Auto-calculated burner size (15% of minimum dimension)
          const burnerGeo = new THREE.CylinderGeometry(clamped, clamped, 4, 32);
          const burnerMat = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#f97316', emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.3 });
          const burnerRingMat = new THREE.MeshStandardMaterial({ color: '#444', metalness: 0.8, roughness: 0.2 });
          // Spacing: center each burner at 22% of the plate dimensions from center
          const bSpX = cW * 0.22;
          const bSpZ = cD * 0.22;
          const allBurnerPos = [
            [-bSpX, 6, -bSpZ],
            [ bSpX, 6, -bSpZ],
            [-bSpX, 6,  bSpZ],
            [ bSpX, 6,  bSpZ]
          ];
          const activeBurners = bCount === 2 ? [allBurnerPos[2], allBurnerPos[3]] : allBurnerPos;
          activeBurners.forEach((pos) => {
            const burner = new THREE.Mesh(burnerGeo, burnerMat);
            burner.position.set(pos[0], pos[1], pos[2]);
            const ringGeo = new THREE.TorusGeometry(clamped + 5, 3, 8, 32);
            const ring = new THREE.Mesh(ringGeo, burnerRingMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(pos[0], pos[1] + 4, pos[2]);
            cooktopPlate.add(burner);
            cooktopPlate.add(ring);
          });

          // Built-in Oven Front
          const ovenDoor = addBoard(width - 40, bodyHeight - 120, 25, 0, legHeight + bodyHeight / 2 - 20, halfD + 15, new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.05, metalness: 0.95 }), 'Шарах шүүгээний хаалга', 'Хаалга');
          
          // Inner window for oven (semi-transparent tinted glass)
          const ovenWindow = addBoard(width - 120, bodyHeight - 200, 5, 0, 0, 14, new THREE.MeshStandardMaterial({ color: '#ca8a04', transparent: true, opacity: 0.35, roughness: 0.1, emissive: '#ca8a04', emissiveIntensity: 0.2 }), 'Шарах шүүгээний шил', 'Их бие');
          ovenDoor.add(ovenWindow);

          // Oven Handle bar
          const handleGeom = new THREE.CylinderGeometry(6, 6, width - 180, 16);
          const handleMat = new THREE.MeshStandardMaterial({ color: '#f5f5f5', metalness: 0.9, roughness: 0.1 });
          const handle = new THREE.Mesh(handleGeom, handleMat);
          handle.rotation.z = Math.PI / 2;
          handle.position.set(0, (bodyHeight - 120) / 2 - 25, 15);
          ovenDoor.add(handle);

        } else if (mod.type === 'sink') {
          // Kitchen Sink Cabinet
          buildLegs();
          addBoard(18, bodyHeight, depth, -halfW + 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Угаалтуурын хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, bodyHeight, depth, halfW - 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Угаалтуурын хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, legHeight + 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');
          addBoard(width - 36, 18, 100, 0, height - 9, halfD - 50, bodyMat, 'Дээд холбоос хавтан (Урд)', 'Дээд тавиур');
          addBoard(width - 36, 18, 100, 0, height - 9, -halfD + 50, bodyMat, 'Дээд холбоос хавтан (Ар)', 'Дээд тавиур');
          addBoard(width, bodyHeight, 3, 0, legHeight + bodyHeight / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Render Countertop if active
          const hasCountertop = config.countertopType && config.countertopType !== 'none';
          const ctT_sink = config.countertopThickness ?? 40;
          if (hasCountertop) {
            const ctMat = getCountertopMaterial(config.countertopType);
            const isStone_sk = config.countertopType === 'stone';
            addBoard(
              width,
              ctT_sink,
              depth + 25,
              0,
              height + ctT_sink / 2,
              12.5,
              ctMat,
              isStone_sk ? 'Чулуун тавцан (Угаалтуур)' : 'Модон тавцан (Угаалтуур)',
              'Дээд тавиур'
            );
          }

          // Render Sink Basin (Угаалтуурын тосгуур) sitting on/in countertop
          const sinkW = width * 0.65;
          const sinkD = depth * 0.7;
          const sinkY = hasCountertop ? (height + ctT_sink + 2) : (height + 2);
          const sinkZ = hasCountertop ? 12.5 : 0;
          const steelMat = new THREE.MeshStandardMaterial({ color: '#9ca3af', metalness: 0.85, roughness: 0.25 });
          
          // Outer rim
          const basinRim = addBoard(sinkW, 4, sinkD, 0, sinkY, sinkZ, steelMat, 'Угаалтуурын амсар', 'Дээд тавиур');
          // Inner bowl (represented as a darker recess)
          const darkBowlMat = new THREE.MeshStandardMaterial({ color: '#4b5563', metalness: 0.7, roughness: 0.4 });
          addBoard(sinkW - 40, 2, sinkD - 40, 0, sinkY + 1, sinkZ, darkBowlMat, 'Угаалтуурын тосгуур', 'Дээд тавиур');

          // Curved Metallic Faucet (Усны цорго)
          const faucetGroup = new THREE.Group();
          // Position faucet at the back-center of the basin
          faucetGroup.position.set(0, sinkY + 2, sinkZ - sinkD/2 + 25);
          moduleGroup.add(faucetGroup);

          // Faucet neck (Vertical pipe)
          const neckGeo = new THREE.CylinderGeometry(8, 8, 140, 16);
          const chromeMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', metalness: 0.95, roughness: 0.05 });
          const verticalNeck = new THREE.Mesh(neckGeo, chromeMat);
          verticalNeck.position.y = 70;
          verticalNeck.castShadow = true;
          faucetGroup.add(verticalNeck);

          // Faucet spout (Horizontal and downward curve)
          const spoutGeo = new THREE.CylinderGeometry(6, 6, 90, 16);
          const spout = new THREE.Mesh(spoutGeo, chromeMat);
          spout.rotation.x = Math.PI / 2;
          spout.position.set(0, 140, 45); // extends forward
          spout.castShadow = true;
          faucetGroup.add(spout);

          const tipGeo = new THREE.CylinderGeometry(6, 6, 25, 16);
          const tip = new THREE.Mesh(tipGeo, chromeMat);
          tip.position.set(0, 130, 90); // goes down
          tip.castShadow = true;
          faucetGroup.add(tip);

          // Faucet handles (hot & cold)
          const handleGeo = new THREE.CylinderGeometry(4, 4, 30, 8);
          const leftHandle = new THREE.Mesh(handleGeo, chromeMat);
          leftHandle.rotation.z = Math.PI / 2;
          leftHandle.position.set(-25, 15, 0);
          faucetGroup.add(leftHandle);

          const rightHandle = new THREE.Mesh(handleGeo, chromeMat);
          rightHandle.rotation.z = Math.PI / 2;
          rightHandle.position.set(25, 15, 0);
          faucetGroup.add(rightHandle);

          // Doors
          if (doors > 0) {
            if (config.customDoors) {
              const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
              const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
              const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
              const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
              const doorH = config.doorHeight ? Number(config.doorHeight) : (bodyHeight - 10);
              const doorY = legHeight + 5 + doorH / 2;

              if (hasLeftDoor) {
                const doorX = width >= 800 ? -halfW + 5 + customDoorWidth / 2 : 0;
                const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга (Зүүн)`, 'Хаалга', {
                  id: `${mod.id}-door-left`,
                  isLeftHinged: true,
                  doorCenterX: doorX,
                  doorWidth: customDoorWidth - 4
                });
                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.x = Math.PI / 2;
                  handle.position.set((customDoorWidth - 4) / 2 - 25, doorH / 2 - 60, 12);
                  doorMesh.add(handle);
                }
              }
              if (hasRightDoor) {
                const doorX = width >= 800 ? halfW - 5 - customDoorWidth / 2 : 0;
                const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга (Баруун)`, 'Хаалга', {
                  id: `${mod.id}-door-right`,
                  isLeftHinged: false,
                  doorCenterX: doorX,
                  doorWidth: customDoorWidth - 4
                });
                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.x = Math.PI / 2;
                  handle.position.set(-((customDoorWidth - 4) / 2 - 25), doorH / 2 - 60, 12);
                  doorMesh.add(handle);
                }
              }
            } else {
              const doorW = (width - 10) / doors;
              for (let i = 0; i < doors; i++) {
                const doorX = -halfW + 5 + doorW / 2 + i * doorW;
                const doorH = bodyHeight - 10;
                const doorY = legHeight + bodyHeight / 2;
                const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
                const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Шүүгээний хаалга`, 'Хаалга', {
                  id: `${mod.id}-door-${i}`,
                  isLeftHinged,
                  doorCenterX: doorX,
                  doorWidth: doorW - 4
                });

                // Handle
                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.x = Math.PI / 2;
                  const handleSide = isLeftHinged ? 1 : -1;
                  handle.position.set(handleSide * ((doorW - 4) / 2 - 25), doorH / 2 - 60, 12);
                  doorMesh.add(handle);
                }
              }
            }
          }

        } else if (mod.type === 'tv_unit') {
          // ── Flat-Screen TV (ТВ Зурагт) ─────────────────────────────
          const tvFrameMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.5, metalness: 0.2 });
          const tvScreenMat = new THREE.MeshStandardMaterial({ color: '#4a4d55', roughness: 0.2, metalness: 0.15 });
          const tvStandMat = new THREE.MeshStandardMaterial({ color: '#1a1c23', roughness: 0.8, metalness: 0.1 });

          // Screen (Front face display panel)
          addBoard(width - 10, height - 10, 5, 0, height / 2, 2.5, tvScreenMat, 'ТВ Дэлгэц', 'Дэлгэц');

          // TV Frame (Cabinet bezel/housing)
          addBoard(width, height, 30, 0, height / 2, -15, tvFrameMat, 'ТВ Хүрээ / Их бие', 'Хажуу хана');

          // Stand Neck and Base (only if tvHasBase is not false)
          if (config.tvHasBase !== false) {
            // Stand Neck (Vertical support column)
            addBoard(80, 120, 40, 0, 60, -10, tvStandMat, 'ТВ Суурь хөл (Босоо)', 'Хуваалт');

            // Stand Base (Horizontal flat base plate sitting on cabinet)
            addBoard(450, 15, 250, 0, 7.5, -10, tvStandMat, 'ТВ Суурь хавтан (Хэвтээ)', 'Доод тавиур');
          }

        } else if (mod.type === 'fridge') {
          // Refrigerator (Stainless steel style)
          const fridgeMat = new THREE.MeshStandardMaterial({ color: '#8e939e', metalness: 0.8, roughness: 0.2 });
          
          // Main Body
          addBoard(width, height, depth, 0, height / 2, 0, fridgeMat, 'Хөргөгчний их бие', 'Их бие');
          
          // Vertical Split French Doors (Upper 65%)
          const doorH = height * 0.65;
          const doorW = width / 2 - 3;
          const doorY = height - doorH / 2 - 10;
          
          const leftDoor = addBoard(doorW, doorH, 20, -width / 4 - 1, doorY, halfD + 10, fridgeMat, 'Хөргөгчний хаалга (Зүүн)', 'Хаалга', {
            id: `${mod.id}-door-left`,
            isLeftHinged: true,
            doorCenterX: -width / 4 - 1,
            doorWidth: doorW
          });
          const rightDoor = addBoard(doorW, doorH, 20, width / 4 + 1, doorY, halfD + 10, fridgeMat, 'Хөргөгчний хаалга (Баруун)', 'Хаалга', {
            id: `${mod.id}-door-right`,
            isLeftHinged: false,
            doorCenterX: width / 4 + 1,
            doorWidth: doorW
          });
          
          // Bottom Freezer Drawer (Lower 30%)
          const freezH = height * 0.30;
          const freezY = freezH / 2 + 15;
          const freezDrawer = addBoard(width - 4, freezH, 20, 0, freezY, halfD + 10, fridgeMat, 'Хөлдөөгчний шургуулга', 'Шургуулга');
          
          // Vertical Handles for French Doors
          const handleGeom = new THREE.CylinderGeometry(5, 5, Math.max(10, doorH - 150), 16);
          const handleMat = new THREE.MeshStandardMaterial({ color: '#e5e5e5', metalness: 0.95, roughness: 0.05 });
          
          const handleLeft = new THREE.Mesh(handleGeom, handleMat);
          handleLeft.position.set(doorW / 2 - 15, -40, 12);
          leftDoor.add(handleLeft);
          
          const handleRight = new THREE.Mesh(handleGeom, handleMat);
          handleRight.position.set(-doorW / 2 + 15, -40, 12);
          rightDoor.add(handleRight);

          // Horizontal handle for freezer drawer
          const freezHandleGeom = new THREE.CylinderGeometry(5, 5, Math.max(10, width - 200), 16);
          const freezHandle = new THREE.Mesh(freezHandleGeom, handleMat);
          freezHandle.rotation.z = Math.PI / 2;
          freezHandle.position.set(0, freezH / 2 - 30, 12);
          freezDrawer.add(freezHandle);

        } else if (mod.type === 'hood') {
          // Range Hood (T-shape stainless steel hood)
          const hoodMat = new THREE.MeshStandardMaterial({ color: '#525252', metalness: 0.9, roughness: 0.1 });
          const blackGlass = new THREE.MeshStandardMaterial({ color: '#171717', transparent: true, opacity: 0.85, roughness: 0.05 });
          
          // Chimney flue
          addBoard(160, height - 120, 160, 0, height/2 + 60, 0, hoodMat, 'Агааржуулагч хоолой', 'Их бие');
          
          // Slanted Glass Canopy (Inclined design hood)
          const canopyPlate = addBoard(width, 20, depth + 50, 0, 60, 60, blackGlass, 'Сорогчийн шилэн таг', 'Их бие');
          canopyPlate.rotation.x = Math.PI / 6; // angled canopy

          // Metal filter box at bottom
          addBoard(width * 0.7, 40, depth * 0.8, 0, 20, 0, hoodMat, 'Сорогч шүүлтүүр хайрцаг', 'Их бие');

        } else if (mod.type === 'built_in_hood') {
          // ── Built-in Hood Cabinet (Шүүгээнд суурилуулсан хэншүү сорогч) ───
          // Wooden Carcass
          addBoard(18, height, depth, -halfW + 9, height / 2, 0, bodyMat, 'Шүүгээний хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, height, depth, halfW - 9, height / 2, 0, bodyMat, 'Шүүгээний хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Шүүгээний дээд таг', 'Дээд тавиур');
          addBoard(width - 36, 18, depth - 20, 0, 141, 10, bodyMat, 'Бэхэлгээний дунд тавиур', 'Дээд тавиур');
          addBoard(width, height, 3, 0, height / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Inside shelves in upper compartment
          if (shelves > 0) {
            const upperH = height - 150 - 18;
            for (let i = 0; i < shelves; i++) {
              const sy = getShelfY(i, shelves, upperH, 150, config, 18);
              addBoard(width - 38, 18, depth - 20, 0, sy, 10, bodyMat, `Дотор тавиур ${i + 1}`, 'Дээд тавиур');
            }
          }

          // Upper Doors
          const doorH = height - 150 - 10;
          const doorY = 150 + 5 + doorH / 2;
          
          if (config.customDoors) {
            const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
            const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
            const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
            const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;

            if (hasLeftDoor) {
              const doorX = width >= 800 ? -halfW + 5 + customDoorWidth / 2 : 0;
              const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Шүүгээний хаалга (Зүүн)', 'Хаалга', {
                id: `${mod.id}-door-left`,
                isLeftHinged: true,
                doorCenterX: doorX,
                doorWidth: customDoorWidth - 4
              });
              if (handleType !== 'none') {
                const handleGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.rotation.x = Math.PI / 2;
                handle.position.set((customDoorWidth - 4) / 2 - 25, -doorH / 2 + 30, 12);
                doorMesh.add(handle);
              }
            }
            if (hasRightDoor) {
              const doorX = width >= 800 ? halfW - 5 - customDoorWidth / 2 : 0;
              const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Шүүгээний хаалга (Баруун)', 'Хаалга', {
                id: `${mod.id}-door-right`,
                isLeftHinged: false,
                doorCenterX: doorX,
                doorWidth: customDoorWidth - 4
              });
              if (handleType !== 'none') {
                const handleGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.rotation.x = Math.PI / 2;
                handle.position.set(-((customDoorWidth - 4) / 2 - 25), -doorH / 2 + 30, 12);
                doorMesh.add(handle);
              }
            }
          } else {
            if (doors > 0) {
              const doorW = (width - 10) / doors;
              for (let i = 0; i < doors; i++) {
                const doorX = -halfW + 5 + doorW / 2 + i * doorW;
                const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
                const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Шүүгээний хаалга', 'Хаалга', {
                  id: `${mod.id}-door-${i}`,
                  isLeftHinged,
                  doorCenterX: doorX,
                  doorWidth: doorW - 4
                });
                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, 30, 8);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.x = Math.PI / 2;
                  const handleSide = isLeftHinged ? 1 : -1;
                  handle.position.set(handleSide * ((doorW - 4) / 2 - 25), -doorH / 2 + 30, 12);
                  doorMesh.add(handle);
                }
              }
            }
          }

          // Built-in range hood components (Stainless chassis + black slide-out frame)
          const steelMat = new THREE.MeshStandardMaterial({ color: '#78716c', metalness: 0.85, roughness: 0.2 });
          const blackMat = new THREE.MeshStandardMaterial({ color: '#171717', metalness: 0.6, roughness: 0.3 });

          // 1. Gray steel main box (chassis) under the partition shelf
          addBoard(width - 50, 110, depth - 40, 0, 95, -20, steelMat, 'Сорогчийн их бие (Металл)', 'Их бие');

          // 2. Fixed underside tray
          addBoard(width - 2, 20, halfD, 0, 30, -halfD / 2, blackMat, 'Сорогчийн суурь', 'Их бие');

          // 3. Sliding filter panel (slides out when doors/drawers factor is active)
          addBoard(width - 10, 20, halfD, 0, 20, halfD / 2 - 10, blackMat, 'Сорогчийн сунадаг шүүлтүүр', 'Шургуулга');

        } else if (mod.type === 'microwave') {
          // Render Wooden Carcass for the microwave upper cabinet
          addBoard(18, height, depth, -halfW + 9, height / 2, 0, bodyMat, 'Печний шүүгээний хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, height, depth, halfW - 9, height / 2, 0, bodyMat, 'Печний шүүгээний хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Печний шүүгээний дээд таг', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, 9, 0, bodyMat, 'Печний шүүгээний доод суурь', 'Доод тавиур');
          addBoard(width, height, 3, 0, height / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Built-in Microwave parameters
          const mwMaxH = 360;
          const hasUpperCompartment = height > mwMaxH + 100;
          const mwH = hasUpperCompartment ? mwMaxH : height - 54;
          const mwW = width - 50;
          const mwD = depth - 20;

          // Render Middle partition shelf if upper compartment exists
          if (hasUpperCompartment) {
            const shelfY = 18 + mwMaxH + 9; // center of the shelf
            addBoard(width - 36, 18, depth - 20, 0, shelfY, 10, bodyMat, 'Печний суурь хэвтээ тавиур', 'Дээд тавиур');

            // Render upper cupboard doors if doors > 0
            if (doors > 0) {
              const doorH = height - shelfY - 27;
              const doorW = (width - 10) / doors;
              const doorY = shelfY + 9 + doorH / 2;
              
              for (let i = 0; i < doors; i++) {
                const doorX = -halfW + 5 + doorW / 2 + i * doorW;
                const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);
                const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'Печний шүүгээний дээд хаалга', 'Хаалга', {
                  id: `${mod.id}-door-${i}`,
                  isLeftHinged,
                  doorCenterX: doorX,
                  doorWidth: doorW - 4
                });
                
                // Chrome handle
                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, Math.max(10, Math.min(80, doorH - 40)), 8);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.x = Math.PI / 2;
                  const handleSide = isLeftHinged ? 1 : -1;
                  handle.position.set(handleSide * ((doorW - 4) / 2 - 25), -doorH / 2 + 30, 12);
                  doorMesh.add(handle);
                }
              }
            }
          }

          // Render built-in Microwave Unit inside the lower compartment (sits on bottom panel)
          const mwY = 18 + mwH / 2 + 10;
          const mwZ = 10; // slightly forward for built-in aesthetic
          
          const caseMat = new THREE.MeshStandardMaterial({ color: '#1f1f1f', metalness: 0.4, roughness: 0.6 });
          const glassMat = new THREE.MeshStandardMaterial({ color: '#090909', metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.85 });

          // Microwave chassis
          const mwChassis = addBoard(mwW, mwH, mwD, 0, mwY, mwZ, caseMat, 'Печ их бие', 'Их бие');
          
          // Front panel door (left 73% width)
          const doorW = mwW * 0.73;
          const doorMesh = addBoard(doorW - 4, mwH - 12, 12, -mwW * 0.12, mwY, mwZ + mwD / 2 + 6, caseMat, 'Печний хаалга', 'Хаалга', {
            id: `${mod.id}-door-mw`,
            isLeftHinged: true,
            doorCenterX: -mwW * 0.12,
            doorWidth: doorW - 4
          });
          
          // Door glass window
          addBoard(doorW - 60, mwH - 60, 4, 0, 0, 7, glassMat, 'Хаалганы шил', 'Их бие', { id: `p-mw-door-glass` });
          
          // Control panel (right 25% width)
          const ctrlW = mwW * 0.22;
          addBoard(ctrlW, mwH - 12, 12, mwW * 0.36, mwY, mwZ + mwD / 2 + 6, caseMat, 'Товчлуурын хэсэг', 'Их бие');
          
          // Glowing Green Time LED (on control panel)
          addBoard(ctrlW - 20, 24, 2, mwW * 0.36, mwY + mwH/2 - 40, mwZ + mwD / 2 + 14, new THREE.MeshBasicMaterial({ color: '#22c55e' }), 'LED дэлгэц', 'Их бие');

          // Door Handle
          const handleGeom = new THREE.CylinderGeometry(3, 3, Math.max(10, mwH - 100), 16);
          const handleMat = new THREE.MeshStandardMaterial({ color: '#d4d4d4', metalness: 0.9, roughness: 0.1 });
          const handle = new THREE.Mesh(handleGeom, handleMat);
          handle.position.set(doorW / 2 - 20, 0, 10);
          doorMesh.add(handle);

        } else if (mod.type === 'oven') {
          // ── Built-in Oven (Духовой шкаф) ───────────────────────────────────
          addBoard(18, height, depth, -halfW + 9, height / 2, 0, bodyMat, 'Духовойн хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, height, depth, halfW - 9, height / 2, 0, bodyMat, 'Духовойн хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Духовойн дээд таг', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, 9, 0, bodyMat, 'Духовойн доод суурь', 'Доод тавиур');
          addBoard(width, height, 3, 0, height / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');
          const ovH2 = Math.min(height - 36, 600);
          const ovW2 = width - 50;
          const ovD2 = depth - 30;
          const ovY2 = 18 + ovH2 / 2;
          const ovBMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', metalness: 0.6, roughness: 0.3 });
          const ovGMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', transparent: true, opacity: 0.9, metalness: 0.9, roughness: 0.02 });
          addBoard(ovW2, ovH2, ovD2, 0, ovY2, 5, ovBMat, 'Духовойн их бие', 'Их бие');
          const ovDr = addBoard(ovW2 - 4, ovH2 - 10, 20, 0, ovY2, ovD2 / 2 + 16, ovBMat, 'Духовойн хаалга', 'Хаалга');
          addBoard(ovW2 - 50, ovH2 - 60, 6, 0, 0, 11, ovGMat, 'Духовойн шил', 'Их бие');
          const ovHnd = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, ovW2 - 80, 16), new THREE.MeshStandardMaterial({ color: '#d4d4d4', metalness: 0.95, roughness: 0.05 }));
          ovHnd.rotation.z = Math.PI / 2; ovHnd.position.set(0, ovH2 / 2 - 35, 13); ovDr.add(ovHnd);
          addBoard(ovW2 - 4, 30, 20, 0, ovY2 + ovH2 / 2 - 15, ovD2 / 2 + 16, new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.5, roughness: 0.4 }), 'Духовойн товчлуур', 'Их бие');
          addBoard(80, 20, 2, -ovW2 / 4, ovY2 + ovH2 / 2 - 15, ovD2 / 2 + 27, new THREE.MeshBasicMaterial({ color: '#f97316' }), 'Цаг дэлгэц', 'Их бие');

        } else if (mod.type === 'dishwasher') {
          // ── Dishwasher (Угаалгын машин) ──────────────────────────────────────
          addBoard(18, height, depth, -halfW + 9, height / 2, 0, bodyMat, 'Угаалгын хажуу хана (Зүүн)', 'Хажуу хана');
          addBoard(18, height, depth, halfW - 9, height / 2, 0, bodyMat, 'Угаалгын хажуу хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, 9, 0, bodyMat, 'Угаалгын доод суурь', 'Доод тавиур');
          addBoard(width, height, 3, 0, height / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');
          const dwPnl = addBoard(width - 4, height - 4, 20, 0, height / 2, halfD + 10, doors > 0 ? doorMat : bodyMat, 'Угаалгын нүүрний хавтан', 'Хаалга');
          addBoard(width - 4, 40, 22, 0, height - 22, halfD + 10, new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.6, roughness: 0.3 }), 'Угаалгын товчлуур', 'Их бие');
          addBoard(12, 12, 3, halfW / 3, height - 25, halfD + 22, new THREE.MeshBasicMaterial({ color: '#22c55e' }), 'Дэлгэц', 'Их бие');
          const dwHnd = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, width - 60, 16), new THREE.MeshStandardMaterial({ color: '#d4d4d4', metalness: 0.95, roughness: 0.05 }));
          dwHnd.rotation.z = Math.PI / 2; dwHnd.position.set(0, height - 50, 12); dwPnl.add(dwHnd);
        } else if (mod.type === 'bed') {
          // ── Bed (Ор) ───────────────────────────────────────────────────────
          const bedLegH = 150; // Leg height
          const frameH = 40;   // Frame rail thickness
          const headboardH = Math.min(height, 900); // Headboard height from floor
          const footboardH = Math.min(height * 0.45, 450);
          const mattressH = 200; // Mattress thickness
          const mattressInset = 20; // Inset from frame edges

          // Material: Body wood for frame, soft fabric for mattress
          const frameMat = bodyMat;
          const mattressMat = new THREE.MeshStandardMaterial({
            color: '#f5f0eb', roughness: 0.95, metalness: 0.0,
          });
          const mattressTopMat = new THREE.MeshStandardMaterial({
            color: '#ffffff', roughness: 0.85, metalness: 0.0,
          });
          const pillowMat = new THREE.MeshStandardMaterial({
            color: '#ffffff', roughness: 0.9, metalness: 0.0,
          });

          // 1. Headboard (толгойн хэсэг)
          addBoard(width, headboardH, 30, 0, headboardH / 2, -halfD + 15, frameMat, 'Толгойн хавтан (Headboard)', 'Хажуу хана');

          // 2. Footboard (хөлийн хэсэг)
          addBoard(width, footboardH, 25, 0, footboardH / 2, halfD - 12.5, frameMat, 'Хөлийн хавтан (Footboard)', 'Хажуу хана');

          // 3. Side rails (хажуу дам нуруу)
          const railY = bedLegH + frameH / 2;
          const railLen = depth - 55; // Between head and foot boards
          addBoard(30, frameH, railLen, -halfW + 15, railY, 0, frameMat, 'Хажуу дам нуруу (Зүүн)', 'Хажуу хана');
          addBoard(30, frameH, railLen, halfW - 15, railY, 0, frameMat, 'Хажуу дам нуруу (Баруун)', 'Хажуу хана');

          // 4. Slats (ламель хавтангууд)
          const slatCount = Math.max(6, Math.floor(depth / 120));
          const slatSpacing = railLen / (slatCount + 1);
          for (let i = 0; i < slatCount; i++) {
            const sz = -railLen / 2 + (i + 1) * slatSpacing;
            addBoard(width - 60, 12, 60, 0, bedLegH + frameH + 6, sz, frameMat, `Ламель ${i + 1}`, 'Доод тавиур');
          }

          // 5. Legs (хөлүүд - 4 ширхэг)
          const legSize = 50;
          const legGeo = new THREE.BoxGeometry(legSize, bedLegH, legSize);
          const legMat = new THREE.MeshStandardMaterial({ color: getMaterialMesh(config.materialId).color, roughness: 0.6 });
          const legPositions = [
            [-halfW + legSize / 2 + 5, bedLegH / 2, -halfD + legSize / 2 + 30],
            [halfW - legSize / 2 - 5, bedLegH / 2, -halfD + legSize / 2 + 30],
            [-halfW + legSize / 2 + 5, bedLegH / 2, halfD - legSize / 2 - 25],
            [halfW - legSize / 2 - 5, bedLegH / 2, halfD - legSize / 2 - 25],
          ];
          legPositions.forEach((pos, li) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.castShadow = true;
            leg.receiveShadow = true;
            leg.userData = {
              baseX: pos[0], baseY: pos[1], baseZ: pos[2],
              expX: (pos[0] > 0 ? 1 : -1) * 40, expY: -20, expZ: (pos[2] > 0 ? 1 : -1) * 40,
              category: 'Хөл', name: `Ор хөл ${li + 1}`
            };
            moduleGroup.add(leg);
          });

          // 6. Mattress (матрас)
          const mY = bedLegH + frameH + 12 + mattressH / 2;
          const mW = width - mattressInset * 2 - 30;
          const mD = depth - 55 - mattressInset;
          addBoard(mW, mattressH, mD, 0, mY, 5, mattressMat, 'Матрас', 'Их бие');

          // 7. Mattress top cover (дэвсгэр)
          addBoard(mW + 20, 8, mD + 15, 0, mY + mattressH / 2 + 4, 10, mattressTopMat, 'Дэвсгэр хөнжил', 'Их бие');

          // 8. Pillows (дэрнүүд)
          const pillowW = Math.min(mW / 2 - 30, 450);
          const pillowGeo = new THREE.BoxGeometry(pillowW, 60, 200);
          // Round pillow edges
          const pillowY = mY + mattressH / 2 + 35;
          const pillowZ = -halfD + 130;

          const pillow1 = new THREE.Mesh(pillowGeo, pillowMat);
          pillow1.position.set(-pillowW / 2 - 15, pillowY, pillowZ);
          pillow1.rotation.x = -0.05;
          pillow1.castShadow = true;
          pillow1.userData = {
            baseX: -pillowW / 2 - 15, baseY: pillowY, baseZ: pillowZ,
            expX: -30, expY: 40, expZ: -20,
            category: 'Их бие', name: 'Дэр (Зүүн)'
          };
          moduleGroup.add(pillow1);

          const pillow2 = new THREE.Mesh(pillowGeo, pillowMat);
          pillow2.position.set(pillowW / 2 + 15, pillowY, pillowZ);
          pillow2.rotation.x = -0.05;
          pillow2.castShadow = true;
          pillow2.userData = {
            baseX: pillowW / 2 + 15, baseY: pillowY, baseZ: pillowZ,
            expX: 30, expY: 40, expZ: -20,
            category: 'Их бие', name: 'Дэр (Баруун)'
          };
          moduleGroup.add(pillow2);

        } else if (mod.type === 'vitrine') {
          // ── Glass Vitrine Display Cabinet (Шилэн витрин шүүгээ) ───────────
          const vitrineGlassMat = new THREE.MeshStandardMaterial({
            color: '#cce8f0',
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.2,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
          });
          const metalFrameMat = new THREE.MeshStandardMaterial({
            color: '#171717', // dark slate/black aluminum
            roughness: 0.4,
            metalness: 0.8,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
          });

          // Left Side Panel
          if (config.glassLeft) {
            // Glass pane
            const lGlass = addBoard(4, height - 40, depth - 40, -halfW + 9, height / 2, 0, vitrineGlassMat, 'Шилэн хажуу хана (Зүүн)', 'Хажуу хана', { id: `${mod.id}-side-l-glass` });
            // Frame profiles as children of the glass panel
            const topR = new THREE.Mesh(new THREE.BoxGeometry(18, 20, depth), metalFrameMat);
            topR.position.set(0, (height - 40)/2 + 10, 0);
            lGlass.add(topR);

            const botR = new THREE.Mesh(new THREE.BoxGeometry(18, 20, depth), metalFrameMat);
            botR.position.set(0, -(height - 40)/2 - 10, 0);
            lGlass.add(botR);

            const frontS = new THREE.Mesh(new THREE.BoxGeometry(18, height - 40, 20), metalFrameMat);
            frontS.position.set(0, 0, (depth - 40)/2 + 10);
            lGlass.add(frontS);

            const backS = new THREE.Mesh(new THREE.BoxGeometry(18, height - 40, 20), metalFrameMat);
            backS.position.set(0, 0, -(depth - 40)/2 - 10);
            lGlass.add(backS);
          } else {
            addBoard(18, height, depth, -halfW + 9, height / 2, 0, bodyMat, 'Хажуу босоо хана (Зүүн)', 'Хажуу хана');
          }

          // Right Side Panel
          if (config.glassRight) {
            // Glass pane
            const rGlass = addBoard(4, height - 40, depth - 40, halfW - 9, height / 2, 0, vitrineGlassMat, 'Шилэн хажуу хана (Баруун)', 'Хажуу хана', { id: `${mod.id}-side-r-glass` });
            // Frame profiles as children of the glass panel
            const topR = new THREE.Mesh(new THREE.BoxGeometry(18, 20, depth), metalFrameMat);
            topR.position.set(0, (height - 40)/2 + 10, 0);
            rGlass.add(topR);

            const botR = new THREE.Mesh(new THREE.BoxGeometry(18, 20, depth), metalFrameMat);
            botR.position.set(0, -(height - 40)/2 - 10, 0);
            rGlass.add(botR);

            const frontS = new THREE.Mesh(new THREE.BoxGeometry(18, height - 40, 20), metalFrameMat);
            frontS.position.set(0, 0, (depth - 40)/2 + 10);
            rGlass.add(frontS);

            const backS = new THREE.Mesh(new THREE.BoxGeometry(18, height - 40, 20), metalFrameMat);
            backS.position.set(0, 0, -(depth - 40)/2 - 10);
            rGlass.add(backS);
          } else {
            addBoard(18, height, depth, halfW - 9, height / 2, 0, bodyMat, 'Хажуу босоо хана (Баруун)', 'Хажуу хана');
          }

          // Top and Bottom Covers (wooden)
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Дээд таг хавтан', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');

          // Back Panel (HDF)
          addBoard(width, height, 3, 0, height / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Glass Shelves
          if (shelves > 0) {
            for (let i = 0; i < shelves; i++) {
              const sy = getShelfY(i, shelves, height - 36, 0, config);
              addBoard(width - 36, 8, depth - 20, 0, sy, 10, vitrineGlassMat, `Шилэн тавиур ${i + 1}`, 'Дээд тавиур');
            }
          }

          // Front Door (Glass with slim black metal frame)
          if (doors > 0) {
            const doorW = (width - 10) / doors;
            const doorH = height - 10;
            const doorY = height / 2;

            for (let i = 0; i < doors; i++) {
              const doorX = -halfW + 5 + doorW / 2 + i * doorW;
              const isLeftHinged = doors > 1 ? (i < Math.ceil(doors / 2)) : (doorX <= 0);

              const doorMesh = addBoard(doorW - 4, doorH, 4, doorX, doorY, halfD + 9, vitrineGlassMat, 'Шилэн хаалга (Төмөр араамтай)', 'Хаалга', {
                id: `${mod.id}-door-${i}`,
                isLeftHinged,
                doorCenterX: doorX,
                doorWidth: doorW - 4
              });

              const fW = doorW - 4;
              const topRail = new THREE.Mesh(new THREE.BoxGeometry(fW, 20, 18), metalFrameMat);
              topRail.position.set(0, doorH / 2 - 10, 7);
              doorMesh.add(topRail);

              const botRail = new THREE.Mesh(new THREE.BoxGeometry(fW, 20, 18), metalFrameMat);
              botRail.position.set(0, -doorH / 2 + 10, 7);
              doorMesh.add(botRail);

              const leftStile = new THREE.Mesh(new THREE.BoxGeometry(20, doorH - 40, 18), metalFrameMat);
              leftStile.position.set(-fW / 2 + 10, 0, 7);
              doorMesh.add(leftStile);

              const rightStile = new THREE.Mesh(new THREE.BoxGeometry(20, doorH - 40, 18), metalFrameMat);
              rightStile.position.set(fW / 2 - 10, 0, 7);
              doorMesh.add(rightStile);

              if (handleType !== 'none') {
                const handleGeom = new THREE.CylinderGeometry(4, 4, 120, 8);
                const handleM = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                const handle = new THREE.Mesh(handleGeom, handleM);
                handle.rotation.x = Math.PI / 2;
                const handleX = isLeftHinged ? (fW / 2 - 25) : (-fW / 2 + 25);
                handle.position.set(handleX, 0, 12);
                doorMesh.add(handle);
              }
            }
          }
        } else if (mod.type === 'cabinet') {
          // ── TV Console / Cabinet (ТВ Тавиур) ─────────────────────────────
          buildLegs();

          // Side walls
          addBoard(18, bodyHeight, depth, -halfW + 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Зүүн)', 'Хажуу хана');
          addBoard(18, bodyHeight, depth, halfW - 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Баруун)', 'Хажуу хана');

          // Top/Bottom Covers
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Дээд таг хавтан', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, legHeight + 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');

          // Back Panel (HDF)
          addBoard(width, bodyHeight, 3, 0, legHeight + bodyHeight / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Sections Layout using getCabinetSections
          const sections = getCabinetSections(width, config);
          const panels = getCabinetFrontPanels(width, config);
          const partitions = sections.length - 1;
          const leftInner = -halfW + 18;

          // Retrieve divider positions
          let dPositions = config.dividerPositions || [];
          if (dPositions.length !== partitions) {
            dPositions = [];
            for (let i = 0; i < partitions; i++) {
              dPositions.push(Math.round((i + 1) * width / (partitions + 1)));
            }
          }

          // Dividers
          for (let i = 0; i < partitions; i++) {
            const dx = -halfW + dPositions[i];
            addBoard(18, bodyHeight - 36, depth - 20, dx, legHeight + bodyHeight / 2, 10, bodyMat, `Дотор босоо хуваалт ${i + 1}`, 'Хуваалт', { partitionIndex: i });
          }

          // Distribute doors, drawers, shelves across sections
          const numSections = sections.length;

          for (let j = 0; j < numSections; j++) {
            const sec = sections[j];
            const panel = panels[j];
            const dx = panel.centerX;
            const secDx = sec.centerX;

            let secDrawers = 0;
            let secDoors = 0;

            // Distribute drawers and doors across all sections
            if (drawers > 0) {
              const hasCustomDrawers = config.leftDrawers !== undefined || config.rightDrawers !== undefined || config.middleDrawers !== undefined;
              if (config.customDoors && hasCustomDrawers) {
                if (j === 0) {
                  secDrawers = config.leftDrawers !== undefined ? Number(config.leftDrawers) : 0;
                } else if (j === numSections - 1) {
                  secDrawers = config.rightDrawers !== undefined ? Number(config.rightDrawers) : 0;
                } else {
                  secDrawers = config.middleDrawers !== undefined ? Number(config.middleDrawers) : 0;
                }
              } else {
                secDrawers = Math.floor(drawers / numSections) + (j < drawers % numSections ? 1 : 0);
              }
            }
            if (doors > 0) {
              const hasCustomDoors = config.leftDoor !== undefined || config.rightDoor !== undefined;
              if (config.customDoors && hasCustomDoors) {
                const leftDoorVal = config.leftDoor !== undefined ? config.leftDoor : (doors === 1 || doors >= 2 ? 1 : 0);
                const rightDoorVal = config.rightDoor !== undefined ? config.rightDoor : (doors >= 2 ? 1 : 0);
                const leftDoorCount = typeof leftDoorVal === 'number' ? leftDoorVal : (leftDoorVal ? 1 : 0);
                const rightDoorCount = typeof rightDoorVal === 'number' ? rightDoorVal : (rightDoorVal ? 1 : 0);

                if (j === 0) {
                  secDoors = leftDoorCount;
                } else if (j === numSections - 1) {
                  secDoors = rightDoorCount;
                } else {
                  secDoors = 0;
                }
              } else {
                secDoors = Math.floor(doors / numSections) + (j < doors % numSections ? 1 : 0);
              }
            }

            const sectionH = bodyHeight - 10;
            const hasDrawersAndDoors = secDrawers > 0 && secDoors > 0;
            const drawerAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;
            const doorAreaH = hasDrawersAndDoors ? sectionH / 2 : sectionH;

            if (secDrawers > 0) {
              // Top area for drawers if both exist, else full height
              const startY = hasDrawersAndDoors ? (legHeight + 5 + doorAreaH) : (legHeight + 5);
              const drH = drawerAreaH / secDrawers;
              for (let i = 0; i < secDrawers; i++) {
                const dy = startY + drH / 2 + i * drH;
                const drawerMesh = addBoard(panel.width, drH - 6, 18, dx, dy, halfD + 9, doorMat, `Шургуулганы нүүр ${i + 1}`, 'Шургуулга');

                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, Math.min(120, panel.width * 0.4), 16);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.z = Math.PI / 2;
                  handle.position.set(0, 0, 12);
                  drawerMesh.add(handle);
                }
              }
            }

            if (secDoors > 0) {
              // Bottom area for doors if both exist, else full height
              const startY = legHeight + 5;
              const doorW = (panel.width - 4 * (secDoors - 1)) / secDoors;
              const doorH = doorAreaH;
              const doorY = startY + doorH / 2;

              for (let i = 0; i < secDoors; i++) {
                const doorX = dx - panel.width / 2 + doorW / 2 + i * (doorW + 4);
                const doorMesh = addBoard(doorW - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, 'ТВ тавиурын доошоо онгойх хаалга', 'Хаалга', { id: `${mod.id}-door-downward-${j}-${i}`, isDownward: true });

                if (handleType !== 'none') {
                  const handleGeom = new THREE.CylinderGeometry(4, 4, Math.min(80, (doorW - 4) * 0.4), 8);
                  const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
                  const handle = new THREE.Mesh(handleGeom, handleMat);
                  handle.rotation.z = Math.PI / 2;
                  handle.position.set(0, doorH / 2 - 25, 12);
                  doorMesh.add(handle);
                }
              }
            }

            // Suppress shelves if it has drawers only, keep if open/door/split
            const hasDrawersOnly = secDrawers > 0 && secDoors === 0;
            if (shelves > 0 && !hasDrawersOnly) {
              const shelvesInSec = shelves; // For cabinet, shelves config is number of shelves per section
              const insideH = hasDrawersAndDoors ? (doorAreaH - 36) : (bodyHeight - 36);
              const baseOffset = hasDrawersAndDoors ? legHeight : legHeight;
              for (let s = 0; s < shelvesInSec; s++) {
                const sy = getShelfY(s, shelvesInSec, insideH, baseOffset, config);
                addBoard(sec.width - 4, 18, depth - 25, secDx, sy, 10, bodyMat, 'Дотор тавиур хавтан', 'Дээд тавиур', { shelfIndex: s });
              }
            }
          }
        } else {
          // TV Console / Standard Carcass Fallback
          buildLegs();
          addBoard(18, bodyHeight, depth, -halfW + 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Зүүн)', 'Хажуу хана');
          addBoard(18, bodyHeight, depth, halfW - 9, legHeight + bodyHeight / 2, 0, bodyMat, 'Хажуу босоо хана (Баруун)', 'Хажуу хана');
          addBoard(width - 36, 18, depth, 0, height - 9, 0, bodyMat, 'Дээд таг хавтан', 'Дээд тавиур');
          addBoard(width - 36, 18, depth, 0, legHeight + 9, 0, bodyMat, 'Доод суурь хавтан', 'Доод тавиур');
          addBoard(width, bodyHeight, 3, 0, legHeight + bodyHeight / 2, -halfD + 1.5, hdfMat, 'Ар тал (ХДФ)', 'Ар тал');

          // Shelves
          if (shelves > 0) {
            for (let i = 0; i < shelves; i++) {
              const sy = getShelfY(i, shelves, bodyHeight - 36, legHeight, config);
              addBoard(width - 36, 18, depth - 10, 0, sy, 0, bodyMat, `Тавиур ${i + 1}`, 'Дээд тавиур', { shelfIndex: i });
            }
          }

          // Doors / Drawers
          const hasLeftDoor = config.leftDoor !== undefined ? !!config.leftDoor : (doors === 1 || doors >= 2);
          const hasRightDoor = config.rightDoor !== undefined ? !!config.rightDoor : (doors >= 2);
          const defaultDoorWidth = width >= 800 ? (width - 10) / 2 : (width - 10);
          const customDoorWidth = config.doorWidth ? Number(config.doorWidth) : defaultDoorWidth;
          const doorH = config.doorHeight ? Number(config.doorHeight) : (bodyHeight - 10);
          const doorY = legHeight + 5 + doorH / 2;

          if (hasLeftDoor) {
            const doorX = width >= 800 ? -halfW + 5 + customDoorWidth / 2 : 0;
            const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Хаалга (Зүүн)`, 'Хаалга', {
              id: `${mod.id}-door-left`,
              isLeftHinged: true,
              doorCenterX: doorX,
              doorWidth: customDoorWidth - 4
            });
            if (handleType !== 'none') {
              const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
              const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
              const handle = new THREE.Mesh(handleGeom, handleMat);
              handle.rotation.x = Math.PI / 2;
              handle.position.set((customDoorWidth - 4) / 2 - 25, 0, 12);
              doorMesh.add(handle);
            }
          }
          if (hasRightDoor) {
            const doorX = width >= 800 ? halfW - 5 - customDoorWidth / 2 : 0;
            const doorMesh = addBoard(customDoorWidth - 4, doorH, 18, doorX, doorY, halfD + 9, doorMat, `Хаалга (Баруун)`, 'Хаалга', {
              id: `${mod.id}-door-right`,
              isLeftHinged: false,
              doorCenterX: doorX,
              doorWidth: customDoorWidth - 4
            });
            if (handleType !== 'none') {
              const handleGeom = new THREE.CylinderGeometry(4, 4, 80, 8);
              const handleMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.1 });
              const handle = new THREE.Mesh(handleGeom, handleMat);
              handle.rotation.x = Math.PI / 2;
              handle.position.set(-((customDoorWidth - 4) / 2 - 25), 0, 12);
              doorMesh.add(handle);
            }
          } else if (drawers > 0) {
            const drH = (bodyHeight - 10) / drawers;
            for (let i = 0; i < drawers; i++) {
              const dy = legHeight + drH / 2 + 5 + i * drH;
              addBoard(width - 10, drH - 6, 18, 0, dy, halfD + 9, doorMat, `Шургуулга ${i + 1}`, 'Шургуулга');
            }
          }
        } // end else (TV console fallback)


        // Render any manual parts associated with this module
        if (mod.type !== 'custom') {
          const manualParts = modParts.filter((p) => p.id.includes('manual'));
          manualParts.forEach((part) => {
            const mat = getMaterialMesh(part.materialId);
            const qty = Number(part.quantity) || 0;
            for (let qIdx = 0; qIdx < qty; qIdx++) {
              let w = Number(part.width) || 0;
              let h = Number(part.height) || 0;
              let d = 18;

              if (part.category === 'Хажуу хана') {
                w = 18; h = part.height; d = part.width;
              } else if (part.category === 'Дээд тавиур' || part.category === 'Доод тавиур') {
                w = part.height; h = 18; d = part.width;
              } else if (part.category === 'Ар тал') {
                w = part.width; h = part.height; d = 3;
              } else if (part.category === 'Хуваалт') {
                w = 18; h = part.height; d = part.width;
              } else if (part.category === 'Хаалга') {
                w = part.width; h = part.height; d = 18;
              } else if (part.category === 'Шургуулга') {
                w = part.height; h = part.width; d = 18;
              }

              const px = 0;
              const py = legHeight + h / 2 + qIdx * 20;
              const pz = qIdx * 20;

              addBoard(w, h, d, px, py, pz, mat, part.name, part.category, { id: `${part.id}-${qIdx}` });
            }
          });
        }

        // Render optional built-in Cooktop/Stove (Плиткэн зуух) on top
        if (config.hasCooktop && mod.type !== 'cooktop') {
          const cW2 = config.cooktopWidth ?? (width - 60);
          const cD2 = config.cooktopDepth ?? (depth - 40);
          const hasCountertop = config.countertopType && config.countertopType !== 'none';
          
          const maxOffsetX2 = Math.max(0, (width - cW2) / 2);
          const xOffset2 = Math.max(-maxOffsetX2, Math.min(maxOffsetX2, config.cooktopXOffset ?? 0));
          
          const defaultZ2 = hasCountertop ? 12.5 : 0;
          const maxOffsetZ2 = Math.max(0, (depth - cD2) / 2);
          const zOffset2 = defaultZ2 + Math.max(-maxOffsetZ2, Math.min(maxOffsetZ2, config.cooktopZOffset ?? 0));

          const cooktopPlateY = hasCountertop ? (height + 38 + 5) : (height + 5);
          const cooktopPlate = addBoard(
            cW2,
            10,
            cD2,
            xOffset2,
            cooktopPlateY,
            zOffset2,
            new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.1, metalness: 0.8 }),
            'Шилэн плитк',
            'Дээд тавиур'
          );
          
          // Draw auto-proportioned burners on the cooktop plate
          const bCount2 = config.burnerCount ?? 4;
          const clamped2 = Math.min(cW2 * 0.15, cD2 * 0.15); // Auto-calculated burner size (15% of minimum dimension)
          const burnerGeo2 = new THREE.CylinderGeometry(clamped2, clamped2, 4, 32);
          const burnerMat2 = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#f97316', emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.3 });
          const burnerRingMat2 = new THREE.MeshStandardMaterial({ color: '#444', metalness: 0.8, roughness: 0.2 });
          // Spacing: center each burner at 22% of the plate dimensions from center
          const bSpX2 = cW2 * 0.22;
          const bSpZ2 = cD2 * 0.22;
          const allBurnerPos2 = [
            [-bSpX2, 6, -bSpZ2],
            [ bSpX2, 6, -bSpZ2],
            [-bSpX2, 6,  bSpZ2],
            [ bSpX2, 6,  bSpZ2]
          ];
          const activeBurners2 = bCount2 === 2 ? [allBurnerPos2[2], allBurnerPos2[3]] : allBurnerPos2;
          activeBurners2.forEach((pos) => {
            const burner = new THREE.Mesh(burnerGeo2, burnerMat2);
            burner.position.set(pos[0], pos[1], pos[2]);
            const ringGeo2 = new THREE.TorusGeometry(clamped2 + 5, 3, 8, 32);
            const ring2 = new THREE.Mesh(ringGeo2, burnerRingMat2);
            ring2.rotation.x = Math.PI / 2;
            ring2.position.set(pos[0], pos[1] + 4, pos[2]);
            cooktopPlate.add(burner);
            cooktopPlate.add(ring2);
          });
        }
      });

      // 3. Add dimension overlay lines (Мэдээллийн шугам) for the selected module
      if (showDimensions && selectedModuleId) {
        const selectedMod = projectModules.find((m) => m.id === selectedModuleId);
        if (selectedMod) {
          const config = selectedMod.config;
          const width = Number(config.width) || 0;
          const height = Number(config.height) || 0;
          const depth = Number(config.depth) || 0;
          const hasLegs = !!config.hasLegs;
          const legHeight = hasLegs ? 100 : 0;
          const bodyHeight = height - legHeight;
          const insideHeight = bodyHeight - 36;
          const shelves = Number(config.shelves) || 0;

          const mx = selectedMod.xOffset;
          const my = selectedMod.yOffset;
          const mz = selectedMod.zOffset;
          const rotationY = selectedMod.rotation || 0;

          const localToWorld = (lx: number, ly: number, lz: number) => {
            const rx = lx * Math.cos(rotationY) + lz * Math.sin(rotationY);
            const rz = -lx * Math.sin(rotationY) + lz * Math.cos(rotationY);
            return new THREE.Vector3(rx + mx, ly + my, rz + mz);
          };

          const drawDimensionLine = (
            start: THREE.Vector3,
            end: THREE.Vector3,
            label: string,
            offset: THREE.Vector3
          ) => {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
            const lineMat = new THREE.LineBasicMaterial({
              color: '#f59e0b',
              linewidth: 2,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1
            });
            const line = new THREE.Line(lineGeo, lineMat);
            dimsGroup.add(line);

            const tickGeo1 = new THREE.BufferGeometry().setFromPoints([
              start.clone().add(offset),
              start.clone().sub(offset)
            ]);
            const tick1 = new THREE.Line(tickGeo1, lineMat);
            dimsGroup.add(tick1);

            const tickGeo2 = new THREE.BufferGeometry().setFromPoints([
              end.clone().add(offset),
              end.clone().sub(offset)
            ]);
            const tick2 = new THREE.Line(tickGeo2, lineMat);
            dimsGroup.add(tick2);
          };

          // Outer Dimension Lines (Rotated)
          const wStart = localToWorld(-width / 2, legHeight - 50, depth / 2 + 50);
          const wEnd = localToWorld(width / 2, legHeight - 50, depth / 2 + 50);
          const wTick = localToWorld(0, 0, 15).sub(localToWorld(0, 0, 0));
          drawDimensionLine(wStart, wEnd, `${width}мм`, wTick);

          const hStart = localToWorld(-width / 2 - 50, legHeight, depth / 2 + 50);
          const hEnd = localToWorld(-width / 2 - 50, height, depth / 2 + 50);
          const hTick = localToWorld(-15, 0, 0).sub(localToWorld(0, 0, 0));
          drawDimensionLine(hStart, hEnd, `${height}мм`, hTick);

          const dStart = localToWorld(-width / 2 - 50, legHeight - 50, -depth / 2);
          const dEnd = localToWorld(-width / 2 - 50, legHeight - 50, depth / 2);
          const dTick = localToWorld(-15, 0, 0).sub(localToWorld(0, 0, 0));
          drawDimensionLine(dStart, dEnd, `${depth}мм`, dTick);

          // Horizontal Partition Dimension Lines (Rotated)
          const sections = getCabinetSections(width, config, selectedMod.type);
          const partitions = sections.length - 1;
          if (partitions > 0) {
            sections.forEach((sec, sIdx) => {
              const startX = sec.centerX - sec.width / 2;
              const endX = sec.centerX + sec.width / 2;
              const pStart = localToWorld(startX, legHeight + 36, depth / 2 - 40);
              const pEnd = localToWorld(endX, legHeight + 36, depth / 2 - 40);
              const pTick = localToWorld(0, 10, 0).sub(localToWorld(0, 0, 0));
              drawDimensionLine(pStart, pEnd, '', pTick);
            });
          }

          // Vertical Shelf Space Dimension Lines (Rotated)
          if (shelves > 0) {
            const sTick = localToWorld(10, 0, 0).sub(localToWorld(0, 0, 0));
            if (partitions > 0) {
              let shelfIdx = 0;
              const storedSecCounts: number[] | undefined = (config as any).sectionShelfCounts;
              const hasValidSecCounts = storedSecCounts && storedSecCounts.length === sections.length && storedSecCounts.reduce((a: number, b: number) => a + b, 0) === shelves;
              sections.forEach((sec, sIdx) => {
                const shelvesInSec = hasValidSecCounts ? storedSecCounts![sIdx] : (Math.floor(shelves / sections.length) + (sIdx < shelves % sections.length ? 1 : 0));
                if (shelvesInSec > 0) {
                  const getSectionShelfCenterY = (secShelfOffsetIdx: number) => {
                    const globalIdx = shelfIdx + secShelfOffsetIdx;
                    if (config.shelfPositions && config.shelfPositions.length === shelves) {
                      const secPositions = [];
                      for (let j = 0; j < shelvesInSec; j++) {
                        secPositions.push(config.shelfPositions[shelfIdx + j]);
                      }
                      secPositions.sort((a, b) => a - b);
                      return legHeight + 18 + secPositions[secShelfOffsetIdx];
                    } else {
                      const step = insideHeight / (shelvesInSec + 1);
                      return legHeight + 18 + (secShelfOffsetIdx + 1) * step;
                    }
                  };

                  for (let i = 0; i <= shelvesInSec; i++) {
                    let startY: number;
                    let endY: number;
                    if (i === 0) {
                      startY = legHeight + 18;
                      endY = getSectionShelfCenterY(0) - 9;
                    } else if (i === shelvesInSec) {
                      startY = getSectionShelfCenterY(shelvesInSec - 1) + 9;
                      endY = legHeight + 18 + insideHeight;
                    } else {
                      startY = getSectionShelfCenterY(i - 1) + 9;
                      endY = getSectionShelfCenterY(i) - 9;
                    }
                    const sStart = localToWorld(sec.centerX, startY, 0);
                    const sEnd = localToWorld(sec.centerX, endY, 0);
                    drawDimensionLine(sStart, sEnd, '', sTick);
                  }
                  shelfIdx += shelvesInSec;
                }
              });
            } else {
              const sortedY = [...(config.shelfPositions || [])].sort((a, b) => a - b);
              const getShelfCenterY = (idx: number) => {
                if (sortedY.length === shelves) {
                  return legHeight + 18 + sortedY[idx];
                } else {
                  const step = insideHeight / (shelves + 1);
                  return legHeight + 18 + (idx + 1) * step;
                }
              };

              for (let i = 0; i <= shelves; i++) {
                let startY: number;
                let endY: number;
                if (i === 0) {
                  startY = legHeight + 18;
                  endY = getShelfCenterY(0) - 9;
                } else if (i === shelves) {
                  startY = getShelfCenterY(shelves - 1) + 9;
                  endY = legHeight + 18 + insideHeight;
                } else {
                  startY = getShelfCenterY(i - 1) + 9;
                  endY = getShelfCenterY(i) - 9;
                }
                const sStart = localToWorld(0, startY, 0);
                const sEnd = localToWorld(0, endY, 0);
                drawDimensionLine(sStart, sEnd, '', sTick);
              }
            }
          }
        }
      }

      // Selection outline removed at user request

      if ((window as any).tavmaxLog) {
        (window as any).tavmaxLog(`buildFurnitureModel completed successfully for project: ${project.id}`);
      }
    } catch (err: any) {
      if ((window as any).tavmaxLog) {
        (window as any).tavmaxLog(`buildFurnitureModel crashed: ${err?.stack || err?.message || String(err)}`);
      }
      const msg = err?.stack || err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setEngineError(msg);
      console.error('ThreeViewer buildFurnitureModel error:', err);
    }
  }

  function updatePiecePositions() {
    try {
      const furnitureGroup = furnitureGroupRef.current;
      if (!furnitureGroup) return;

      const { explodeFactor, doorOpenFactor } = animState.current;
      
      if (Math.random() < 0.008) {
        console.log("ThreeViewer: updatePiecePositions factor =", doorOpenFactor, "explode =", explodeFactor);
      }

      furnitureGroup.children.forEach((groupObj) => {
        const moduleGroup = groupObj as THREE.Group;
        moduleGroup.children.forEach((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.userData || mesh.userData.baseX === undefined) return;

          const { baseX, baseY, baseZ, expX, expY, expZ, category } = mesh.userData;

          let targetX = baseX + expX * explodeFactor;
          let targetY = baseY + expY * explodeFactor;
          let targetZ = baseZ + expZ * explodeFactor;

          if (category === 'Хаалга') {
            const isDownward = !!mesh.userData.isDownward;
            const openAngle = (Math.PI / 2.3) * doorOpenFactor;

            if (isDownward) {
              mesh.rotation.x = openAngle;
              const doorH = (mesh.geometry as THREE.BoxGeometry).parameters.height;
              targetY += (doorH / 2) * (Math.cos(openAngle) - 1);
              targetZ += (doorH / 2) * Math.sin(openAngle);
            } else {
              const isLeftHinged = mesh.userData.isLeftHinged !== undefined
                ? mesh.userData.isLeftHinged
                : (mesh.userData.id.includes('left') || baseX < 0);
              mesh.rotation.y = isLeftHinged ? -openAngle : openAngle;

              const doorCenterX = mesh.userData.doorCenterX !== undefined ? mesh.userData.doorCenterX : baseX;
              const doorWidth = mesh.userData.doorWidth !== undefined ? mesh.userData.doorWidth : (mesh.geometry as THREE.BoxGeometry).parameters.width;
              const hingeWidthOffset = doorWidth / 2;

              const hingeX = doorCenterX + (isLeftHinged ? -1 : 1) * hingeWidthOffset;
              const rotOffsetX = (baseX - hingeX) * Math.cos(mesh.rotation.y) - (baseX - hingeX);
              const rotOffsetZ = - (baseX - hingeX) * Math.sin(mesh.rotation.y);

              targetX += rotOffsetX;
              targetZ += rotOffsetZ;
            }
          } else if (category === 'Шургуулга') {
            targetZ += 300 * doorOpenFactor;
          } else {
            mesh.rotation.set(0, 0, 0);
          }

          mesh.position.set(targetX, targetY, targetZ);
        });
      });
      } catch (err: any) {
        const msg = err?.stack || err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        setEngineError(msg);
        console.error('ThreeViewer render error:', err);
      }
  }

  if (engineError) {
    return (
      <div className="w-full h-full min-h-[400px] bg-red-950/10 border border-red-500/20 rounded-2xl p-6 flex flex-col justify-center gap-2 font-mono text-xs text-red-400">
        <div className="font-bold text-sm text-red-500">3D Visualizer Error:</div>
        <pre className="whitespace-pre-wrap overflow-auto max-h-[300px]">{engineError}</pre>
        <button
          onClick={() => {
            setEngineError(null);
            window.location.reload();
          }}
          className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg cursor-pointer self-start"
        >
          Дахин ачааллах (Reload)
        </button>
      </div>
    );
  }

  // Compute distance for display
  const measuredDistanceMM = measurePoints.a && measurePoints.b
    ? Math.round(measurePoints.a.distanceTo(measurePoints.b))
    : null;
  const measuredDX = measurePoints.a && measurePoints.b
    ? Math.abs(Math.round(measurePoints.b.x - measurePoints.a.x))
    : null;
  const measuredDY = measurePoints.a && measurePoints.b
    ? Math.abs(Math.round(measurePoints.b.y - measurePoints.a.y))
    : null;
  const measuredDZ = measurePoints.a && measurePoints.b
    ? Math.abs(Math.round(measurePoints.b.z - measurePoints.a.z))
    : null;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-[#0c0d12] border border-white/5">
      <div ref={containerRef} className="w-full h-full relative z-0" />
      <div id="dimensions-labels-container" className="absolute inset-0 pointer-events-none overflow-hidden z-30" />

      {/* Empty visualizer guidance */}
      {(!project.modules || project.modules.length === 0) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0c0d12]/90 backdrop-blur-sm z-30 pointer-events-none">
          <div className="w-20 h-20 mb-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 animate-bounce">
            <Box size={36} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">3D Төлөвлөгч Хоосон байна</h3>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed mb-6">
            Зүүн талын цэснээс шүүгээ чирж оруулах эсвэл "Нэмэх" товчийг дарж загварлаж эхэлнэ үү.
          </p>
          <div className="flex gap-2 text-[10px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-500/20">
            <span>👈 Зүүн талаас шүүгээ чирж оруулна уу</span>
          </div>
        </div>
      )}

      {/* A-B Measurement Overlay */}
      {measureMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
          {/* Instruction banner */}
          {!measurePoints.a && (
            <div className="bg-emerald-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-lg border border-emerald-400/50 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              А цэг сонгоно уу — аль нэг гадаргуу дарна
            </div>
          )}
          {measurePoints.a && !measurePoints.b && (
            <div className="bg-amber-500/90 backdrop-blur-sm text-neutral-900 text-[11px] font-bold px-4 py-2 rounded-full shadow-lg border border-amber-400/50 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              В цэг сонгоно уу — хэмжих өөр цэгийг дарна
            </div>
          )}
          {/* Result card */}
          {measurePoints.a && measurePoints.b && measuredDistanceMM !== null && (
            <div className="bg-[#0c0d12]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl px-5 py-3 shadow-2xl flex flex-col items-center gap-1">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-0.5">A → B Хэмжилт</div>
              <div className="text-amber-400 font-black text-2xl tabular-nums">
                {measuredDistanceMM} <span className="text-base font-semibold">мм</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-semibold">
                {(measuredDistanceMM / 1000).toFixed(3)} м
              </div>
              <div className="flex gap-3 mt-1">
                <span className="text-[10px] text-neutral-400">Х: <span className="text-cyan-400 font-bold">{measuredDX}мм</span></span>
                <span className="text-[10px] text-neutral-400">Y: <span className="text-cyan-400 font-bold">{measuredDY}мм</span></span>
                <span className="text-[10px] text-neutral-400">Z: <span className="text-cyan-400 font-bold">{measuredDZ}мм</span></span>
              </div>
              <div className="text-[9px] text-neutral-500 mt-1.5 flex items-center gap-1">
                <span>✦</span> Цэгүүдийг чирж байршлыг өөрчилж болно
              </div>
              <div className="text-[9px] text-neutral-600">Шинэ хэмжилт: хоосон талбай дарна</div>
            </div>
          )}
        </div>
      )}

      {/* A/B point labels on canvas corners */}
      {measureMode && measurePoints.a && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg px-2 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-bold">A ● чирж зөөх боломжтой</span>
        </div>
      )}
      {measureMode && measurePoints.b && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] text-amber-400 font-bold">B ● чирж зөөх боломжтой</span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 glass">
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-slow" />
            3D Харах Идэвхтэй
          </span>
        </div>
        <div className="text-xs text-white/70">
          {measureMode
            ? 'Метр горим: Гадаргуун аль нэг цэгийг дарж А→В хэмжинэ'
            : 'Хайрцгийг зөөхөөр чирч хөдөлгөнө үү. Хажуугийн цэснээс чирж олноор нэмж болно.'}
        </div>
      </div>
    </div>
  );
});

export default ThreeViewer;

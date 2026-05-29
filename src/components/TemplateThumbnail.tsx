import React, { useEffect, useState } from 'react';
import * as THREE from 'three';

interface TemplateConfig {
  width: number;
  height: number;
  depth: number;
  shelves?: number;
  drawers?: number;
  doors?: number;
  hasLegs?: boolean;
  countertopType?: string;
  color?: string;
  glassLeft?: boolean;
  glassRight?: boolean;
  tvHasBase?: boolean;
}

interface Props {
  type: string;
  config: TemplateConfig;
  name: string;
}

// ─── Singleton shared renderer ────────────────────────────────────────────────
let _renderer: THREE.WebGLRenderer | null = null;
function getRenderer(): THREE.WebGLRenderer | null {
  if (_renderer) return _renderer;
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = 400;
    offscreen.height = 300;
    _renderer = new THREE.WebGLRenderer({
      canvas: offscreen,
      antialias: true,
      alpha: false,
      powerPreference: 'low-power',
    });
    _renderer.setClearColor(0x0c0e18, 1);
    _renderer.shadowMap.enabled = false;
    return _renderer;
  } catch {
    return null;
  }
}

// ─── Build and render a scene, return dataURL ─────────────────────────────────
function renderThumbnail(type: string, cfg: TemplateConfig): string {
  const renderer = getRenderer();
  if (!renderer) return '';

  const RW = 400;
  const RH = 300;
  renderer.setSize(RW, RH, false);

  const scene = new THREE.Scene();

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xfff8e8, 2.2);
  key.position.set(800, 1400, 1200);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.7);
  fill.position.set(-600, 400, -800);
  scene.add(fill);

  // Floor grid
  const grid = new THREE.GridHelper(8000, 20, 0x334155, 0x1e293b);
  scene.add(grid);

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#faf9f6', roughness: 0.4, metalness: 0.02 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#fcfbfa', roughness: 0.25, metalness: 0.02 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1e2026', roughness: 0.35, metalness: 0.2 });
  const hdfMat  = new THREE.MeshStandardMaterial({ color: '#e5e1da', roughness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#e5e5e5', roughness: 0.05, metalness: 0.95 });
  const stoneMat  = new THREE.MeshStandardMaterial({ color: '#d1d1d6', roughness: 0.25, metalness: 0.05 });
  const woodCtMat = new THREE.MeshStandardMaterial({ color: '#d99a4e', roughness: 0.5 });

  const { width: W3, height, depth,
          doors = 0, drawers = 0, shelves = 0,
          hasLegs = false, countertopType } = cfg;

  const halfW = W3 / 2;
  const halfD = depth / 2;
  const legH  = hasLegs ? 100 : 0;
  const bodyH = height - legH;

  const addBox = (w: number, h: number, d: number,
                  x: number, y: number, z: number,
                  mat: THREE.Material): THREE.Mesh => {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    // Add high-contrast distinct outlines for clear panel visibility
    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9ca3af });
    const line = new THREE.LineSegments(edges, lineMat);
    mesh.add(line);

    return mesh;
  };

  if (type === 'fridge') {
    const fridgeMat = new THREE.MeshStandardMaterial({ color: '#d1d5db', roughness: 0.2, metalness: 0.45 });
    addBox(W3, height, depth, 0, height / 2, 0, fridgeMat);
    addBox(W3 - 10, height - 10, 20, 0, height / 2, halfD + 10, fridgeMat);
    const hnd = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 200, 12), chromeMat);
    hnd.rotation.z = Math.PI / 2;
    hnd.position.set(halfW - 40, height * 0.6, halfD + 22);
    scene.add(hnd);
  } else if (type === 'tv_unit') {
    const tvFrameMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.5, metalness: 0.2 });
    const tvScreenMat = new THREE.MeshStandardMaterial({ color: '#4a4d55', roughness: 0.2, metalness: 0.15 });
    const tvStandMat = new THREE.MeshStandardMaterial({ color: '#1a1c23', roughness: 0.8, metalness: 0.1 });

    addBox(W3 - 10, height - 10, 5, 0, height / 2, 2.5, tvScreenMat);
    addBox(W3, height, 30, 0, height / 2, -15, tvFrameMat);
    if (cfg.tvHasBase !== false) {
      addBox(80, 120, 40, 0, 60, -10, tvStandMat);
      addBox(450, 15, 250, 0, 7.5, -10, tvStandMat);
    }
  } else if (type === 'hood') {
    // Range Hood (T-shape stainless steel hood matching ThreeViewer)
    const hoodMat = new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.85, roughness: 0.15 });
    const blackGlass = new THREE.MeshStandardMaterial({ color: '#171717', transparent: true, opacity: 0.85, roughness: 0.05 });
    
    // Chimney flue
    addBox(160, height - 120, 160, 0, height / 2 + 60, 0, hoodMat);
    
    // Slanted Glass Canopy (Inclined design hood)
    const canopyPlate = addBox(W3, 20, depth + 50, 0, 60, 60, blackGlass);
    canopyPlate.rotation.x = Math.PI / 6;

    // Metal filter box at bottom
    addBox(W3 * 0.7, 40, depth * 0.8, 0, 20, 0, hoodMat);
  } else if (type === 'built_in_hood') {
    addBox(18, height, depth, -halfW + 9, height / 2, 0, bodyMat);
    addBox(18, height, depth,  halfW - 9, height / 2, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, height - 9, 0, bodyMat);
    addBox(W3 - 36, 18, depth - 20, 0, 141, 10, bodyMat);
    addBox(W3, height, 3, 0, height / 2, -halfD + 1.5, hdfMat); // Back HDF panel
    const doorH = height - 150 - 10;
    const doorY = 150 + 5 + doorH / 2;
    if (doors > 0) {
      const dw = (W3 - 10) / doors;
      for (let i = 0; i < doors; i++) {
        const dx = -halfW + 5 + dw / 2 + i * dw;
        addBox(dw - 4, doorH, 18, dx, doorY, halfD + 9, doorMat);
      }
    }
    addBox(W3 - 2, 20, halfD, 0, 30, -halfD / 2, darkMat);
    addBox(W3 - 10, 20, halfD, 0, 20, halfD / 2 - 10, darkMat);
  } else if (type === 'cooktop') {
    // Left & Right carcass side walls
    addBox(18, bodyH, depth, -halfW + 9, legH + bodyH / 2, 0, bodyMat);
    addBox(18, bodyH, depth,  halfW - 9, legH + bodyH / 2, 0, bodyMat);
    // Bottom panel
    addBox(W3 - 36, 18, depth, 0, legH + 9, 0, bodyMat);
    // Top rails
    addBox(W3 - 36, 18, 100, 0, height - 9, halfD - 50, bodyMat);
    addBox(W3 - 36, 18, 100, 0, height - 9, -halfD + 50, bodyMat);
    // Back HDF panel
    addBox(W3, bodyH, 3, 0, legH + bodyH / 2, -halfD + 1.5, hdfMat);

    // Countertop
    if (countertopType && countertopType !== 'none') {
      addBox(W3, 30, depth + 25, 0, height + 15, 12.5, countertopType === 'stone' ? stoneMat : woodCtMat);
    }

    // Cooktop plate
    const ctMat = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.1, metalness: 0.8 });
    const ctPlateY = (countertopType && countertopType !== 'none') ? height + 35 : height + 10;
    const ctPlate = addBox(W3 - 10, 15, depth - 10, 0, ctPlateY, (countertopType && countertopType !== 'none') ? 12.5 : 0, ctMat);

    // Burners
    const burnerMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', emissive: '#f97316', emissiveIntensity: 0.45, roughness: 0.2 });
    for (const [bx, bz] of [[-W3*0.2, depth*0.2],[W3*0.2, depth*0.2],[-W3*0.2,-depth*0.2],[W3*0.2,-depth*0.2]] as [number,number][]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 6, 16), burnerMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(bx, 8, bz);
      ctPlate.add(b);
    }

    // Built-in Oven Unit Front
    const ovenOvenDoorMat = new THREE.MeshStandardMaterial({ color: '#0f0f12', roughness: 0.1, metalness: 0.9 });
    const ovenDoor = addBox(W3 - 40, bodyH - 120, 20, 0, legH + bodyH / 2 - 20, halfD + 10, ovenOvenDoorMat);

    // Tinted oven glass window
    const ovenWinMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', transparent: true, opacity: 0.35, roughness: 0.1, emissive: '#ca8a04', emissiveIntensity: 0.2 });
    const ovenWindow = addBox(W3 - 120, bodyH - 200, 5, 0, 0, 11, ovenWinMat);
    ovenDoor.add(ovenWindow);

    // Oven handle
    const hnd = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, W3 - 180, 16), chromeMat);
    hnd.rotation.z = Math.PI / 2;
    hnd.position.set(0, (bodyH - 120) / 2 - 25, 12);
    ovenDoor.add(hnd);
  } else if (type === 'microwave') {
    addBox(18, height, depth, -halfW + 9, height / 2, 0, bodyMat);
    addBox(18, height, depth,  halfW - 9, height / 2, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, height - 9, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, 9, 0, bodyMat);
    const mwMat = new THREE.MeshStandardMaterial({ color: '#1f1f1f', metalness: 0.4, roughness: 0.6 });
    addBox(W3 - 50, height * 0.45, depth - 20, 0, height * 0.27, 5, mwMat);
    addBox(W3 - 60, height * 0.43, 18, 0, height * 0.27, halfD + 11, mwMat);
    addBox(40, 16, 3, -W3 * 0.2, height * 0.27, halfD + 21, new THREE.MeshBasicMaterial({ color: '#22c55e' }));
  } else if (type === 'oven') {
    addBox(18, height, depth, -halfW + 9, height / 2, 0, bodyMat);
    addBox(18, height, depth,  halfW - 9, height / 2, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, height - 9, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, 9, 0, bodyMat);
    const ovH = Math.min(height - 36, 580);
    const ovW = W3 - 50; const ovD = depth - 30;
    addBox(ovW, ovH, ovD, 0, 18 + ovH / 2, 5, darkMat);
    const ovDr = addBox(ovW - 4, ovH - 10, 18, 0, 18 + ovH / 2, ovD / 2 + 14, darkMat);
    const hnd = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, ovW - 80, 16), chromeMat);
    hnd.rotation.z = Math.PI / 2; hnd.position.set(0, ovH / 2 - 35, 11); ovDr.add(hnd);
    addBox(50, 15, 3, -ovW * 0.25, 18 + ovH - 20, ovD / 2 + 22, new THREE.MeshBasicMaterial({ color: '#f97316' }));
  } else if (type === 'dishwasher') {
    addBox(18, height, depth, -halfW + 9, height / 2, 0, bodyMat);
    addBox(18, height, depth,  halfW - 9, height / 2, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, 9, 0, bodyMat);
    const pnl = addBox(W3 - 4, height - 4, 18, 0, height / 2, halfD + 9, doorMat);
    addBox(W3 - 4, 36, 20, 0, height - 20, halfD + 9, darkMat);
    addBox(10, 10, 3, halfW / 3, height - 24, halfD + 20, new THREE.MeshBasicMaterial({ color: '#22c55e' }));
    const h2 = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, W3 - 60, 16), chromeMat);
    h2.rotation.z = Math.PI / 2; h2.position.set(0, height - 50, 11); pnl.add(h2);
  } else if (type === 'kitchen_lower' || type === 'sink') {
    if (hasLegs) {
      for (const lx of [-halfW + 40, halfW - 40])
        for (const lz of [-halfD + 30, halfD - 30])
          addBox(30, legH, 30, lx, legH / 2, lz, bodyMat);
    }
    addBox(18, bodyH, depth, -halfW + 9, legH + bodyH / 2, 0, bodyMat);
    addBox(18, bodyH, depth,  halfW - 9, legH + bodyH / 2, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, legH + 9, 0, bodyMat);
    addBox(W3 - 36, 18, 100, 0, height - 9, halfD - 50, bodyMat);
    addBox(W3, bodyH, 3, 0, legH + bodyH / 2, -halfD + 1.5, hdfMat);
    if (countertopType && countertopType !== 'none') {
      addBox(W3, 30, depth + 25, 0, height + 15, 12.5, countertopType === 'stone' ? stoneMat : woodCtMat);
    }
    if (type === 'sink') {
      const sinkM = new THREE.MeshStandardMaterial({ color: '#8a9099', roughness: 0.2, metalness: 0.7 });
      addBox(W3 * 0.55, 28, depth * 0.55, 0, height + 15, 0, sinkM);
      const fc = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 160, 12),
        new THREE.MeshStandardMaterial({ color: '#c8c8c8', roughness: 0.05, metalness: 0.95 }));
      fc.position.set(0, height + 100, -depth * 0.15); scene.add(fc);
    } else if (drawers > 0 && doors === 0) {
      const drH = (bodyH - 10) / drawers;
      for (let i = 0; i < drawers; i++)
        addBox(W3 - 10, drH - 6, 18, 0, legH + drH / 2 + 5 + i * drH, halfD + 9, doorMat);
    } else if (doors > 0) {
      const dw = (W3 - 10) / doors;
      for (let i = 0; i < doors; i++) {
        const dx = -halfW + 5 + dw / 2 + i * dw;
        const dr = addBox(dw - 4, bodyH - 10, 18, dx, legH + bodyH / 2, halfD + 9, doorMat);
        const hnd = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 80, 8), chromeMat);
        hnd.rotation.x = Math.PI / 2;
        hnd.position.set(i % 2 === 0 ? dw / 2 - 25 : -(dw / 2 - 25), 0, 12);
        dr.add(hnd);
      }
    }
  } else if (type === 'vitrine') {
    const vitrineGlassMat = new THREE.MeshStandardMaterial({
      color: '#cce8f0',
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    const metalFrameMat = new THREE.MeshStandardMaterial({
      color: '#171717',
      roughness: 0.4,
      metalness: 0.8
    });

    // Left side (glass or wood)
    if (cfg.glassLeft) {
      addBox(4, height - 40, depth - 40, -halfW + 9, height / 2, 0, vitrineGlassMat);
      addBox(18, 20, depth, -halfW + 9, height - 30, 0, metalFrameMat);
      addBox(18, 20, depth, -halfW + 9, 30, 0, metalFrameMat);
      addBox(18, height - 40, 20, -halfW + 9, height / 2, halfD - 20, metalFrameMat);
      addBox(18, height - 40, 20, -halfW + 9, height / 2, -halfD + 20, metalFrameMat);
    } else {
      addBox(18, height, depth, -halfW + 9, height / 2, 0, bodyMat);
    }

    // Right side (glass or wood)
    if (cfg.glassRight) {
      addBox(4, height - 40, depth - 40, halfW - 9, height / 2, 0, vitrineGlassMat);
      addBox(18, 20, depth, halfW - 9, height - 30, 0, metalFrameMat);
      addBox(18, 20, depth, halfW - 9, 30, 0, metalFrameMat);
      addBox(18, height - 40, 20, halfW - 9, height / 2, halfD - 20, metalFrameMat);
      addBox(18, height - 40, 20, halfW - 9, height / 2, -halfD + 20, metalFrameMat);
    } else {
      addBox(18, height, depth, halfW - 9, height / 2, 0, bodyMat);
    }

    // Top and Bottom Covers
    addBox(W3 - 36, 18, depth, 0, height - 9, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, 9, 0, bodyMat);

    // Back panel
    addBox(W3, height, 3, 0, height / 2, -halfD + 1.5, hdfMat);

    // Glass shelves
    if (shelves > 0) {
      const step = (height - 36) / (shelves + 1);
      for (let i = 0; i < shelves; i++) {
        addBox(W3 - 36, 8, depth - 20, 0, 18 + (i + 1) * step, 10, vitrineGlassMat);
      }
    }

    // Front glass door with metal frame
    if (doors > 0) {
      const dw = (W3 - 10) / doors;
      const doorH = height - 10;
      for (let i = 0; i < doors; i++) {
        const dx = -halfW + 5 + dw / 2 + i * dw;
        addBox(dw - 4, doorH, 4, dx, height / 2, halfD + 9, vitrineGlassMat);
        addBox(dw - 4, 20, 18, dx, height - 20, halfD + 9, metalFrameMat);
        addBox(dw - 4, 20, 18, dx, 20, halfD + 9, metalFrameMat);
        addBox(20, doorH - 40, 18, dx - dw / 2 + 10, height / 2, halfD + 9, metalFrameMat);
        addBox(20, doorH - 40, 18, dx + dw / 2 - 10, height / 2, halfD + 9, metalFrameMat);
      }
    }
  } else if (type === 'kitchen_upper') {
    addBox(18, height, depth, -halfW + 9, height / 2, 0, bodyMat);
    addBox(18, height, depth,  halfW - 9, height / 2, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, height - 9, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, 9, 0, bodyMat);
    addBox(W3, height, 3, 0, height / 2, -halfD + 1.5, hdfMat);
    if (shelves > 0) {
      const step = (height - 36) / (shelves + 1);
      for (let i = 0; i < shelves; i++)
        addBox(W3 - 36, 18, depth - 20, 0, 18 + (i + 1) * step, 5, bodyMat);
    }
    if (doors > 0) {
      const dw = (W3 - 10) / doors;
      for (let i = 0; i < doors; i++) {
        const dx = -halfW + 5 + dw / 2 + i * dw;
        const dr = addBox(dw - 4, height - 10, 18, dx, height / 2, halfD + 9, doorMat);
        const hnd = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 30, 8), chromeMat);
        hnd.rotation.x = Math.PI / 2;
        hnd.position.set(i % 2 === 0 ? dw / 2 - 25 : -(dw / 2 - 25), -height / 2 + 30, 12);
        dr.add(hnd);
      }
    }
  } else if (type === 'cabinet') {
    if (hasLegs) {
      for (const lx of [-halfW + 40, halfW - 40])
        addBox(30, legH, 30, lx, legH / 2, 0, bodyMat);
    }
    // Side walls
    addBox(18, bodyH, depth, -halfW + 9, legH + bodyH / 2, 0, bodyMat);
    addBox(18, bodyH, depth, halfW - 9, legH + bodyH / 2, 0, bodyMat);
    // Covers
    addBox(W3 - 36, 18, depth, 0, height - 9, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, legH + 9, 0, bodyMat);
    // Back HDF
    addBox(W3, bodyH, 3, 0, legH + bodyH / 2, -halfD + 1.5, hdfMat);

    if (doors > 0 && drawers > 0) {
      const numSections = doors + 1;
      const sectionW = (W3 - 36 - (numSections - 1) * 18) / numSections;
      for (let i = 0; i < numSections - 1; i++) {
        const dx = -halfW + 18 + sectionW + 9 + i * (sectionW + 18);
        addBox(18, bodyH - 36, depth - 20, dx, legH + bodyH / 2, 10, bodyMat);
      }
      for (let i = 0; i < doors; i++) {
        const dx = -halfW + 18 + sectionW / 2 + i * (sectionW + 18);
        const dr = addBox(sectionW - 4, bodyH - 10, 18, dx, legH + bodyH / 2, halfD + 9, doorMat);
        const hnd = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 30, 8), chromeMat);
        hnd.rotation.z = Math.PI / 2; hnd.position.set(0, (bodyH - 10) / 2 - 15, 12); dr.add(hnd);
        if (shelves > 0) {
          const step = (bodyH - 36) / (shelves + 1);
          for (let s = 0; s < shelves; s++)
            addBox(sectionW - 4, 18, depth - 25, dx, legH + 18 + (s + 1) * step, 10, bodyMat);
        }
      }
      const dx = halfW - 18 - sectionW / 2;
      const drH = (bodyH - 10) / drawers;
      for (let i = 0; i < drawers; i++)
        addBox(sectionW - 4, drH - 6, 18, dx, legH + drH / 2 + 5 + i * drH, halfD + 9, doorMat);

    } else if (doors > 0 && drawers === 0) {
      const numSections = doors;
      const sectionW = (W3 - 36 - (numSections - 1) * 18) / numSections;
      for (let i = 0; i < numSections - 1; i++) {
        const dx = -halfW + 18 + sectionW + 9 + i * (sectionW + 18);
        addBox(18, bodyH - 36, depth - 20, dx, legH + bodyH / 2, 10, bodyMat);
      }
      for (let i = 0; i < doors; i++) {
        const dx = -halfW + 18 + sectionW / 2 + i * (sectionW + 18);
        const dr = addBox(sectionW - 4, bodyH - 10, 18, dx, legH + bodyH / 2, halfD + 9, doorMat);
        const hnd = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 30, 8), chromeMat);
        hnd.rotation.z = Math.PI / 2; hnd.position.set(0, (bodyH - 10) / 2 - 15, 12); dr.add(hnd);
        if (shelves > 0) {
          const step = (bodyH - 36) / (shelves + 1);
          for (let s = 0; s < shelves; s++)
            addBox(sectionW - 4, 18, depth - 25, dx, legH + 18 + (s + 1) * step, 10, bodyMat);
        }
      }
    } else if (doors === 0 && drawers > 0) {
      const drH = (bodyH - 10) / drawers;
      for (let i = 0; i < drawers; i++)
        addBox(W3 - 10, drH - 6, 18, 0, legH + drH / 2 + 5 + i * drH, halfD + 9, doorMat);
    } else {
      if (shelves > 0) {
        const step = (bodyH - 36) / (shelves + 1);
        for (let i = 0; i < shelves; i++)
          addBox(W3 - 36, 18, depth - 10, 0, legH + 18 + (i + 1) * step, 0, bodyMat);
      }
    }
  } else {
    // Wardrobe / bookshelf / cabinet / custom / tall
    if (hasLegs)
      for (const lx of [-halfW + 40, halfW - 40])
        addBox(30, legH, 30, lx, legH / 2, 0, bodyMat);
    addBox(18, bodyH, depth, -halfW + 9, legH + bodyH / 2, 0, bodyMat);
    addBox(18, bodyH, depth,  halfW - 9, legH + bodyH / 2, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, height - 9, 0, bodyMat);
    addBox(W3 - 36, 18, depth, 0, legH + 9, 0, bodyMat);
    addBox(W3, bodyH, 3, 0, legH + bodyH / 2, -halfD + 1.5, hdfMat);
    if (shelves > 0) {
      const step = (bodyH - 36) / (shelves + 1);
      for (let i = 0; i < shelves; i++)
        addBox(W3 - 36, 18, depth - 10, 0, legH + 18 + (i + 1) * step, 0, bodyMat);
    }
    if (doors > 0) {
      const dw = (W3 - 10) / doors;
      for (let i = 0; i < doors; i++) {
        const dx = -halfW + 5 + dw / 2 + i * dw;
        const dr = addBox(dw - 4, bodyH - 10, 18, dx, legH + bodyH / 2, halfD + 9, doorMat);
        const hnd = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 80, 8), chromeMat);
        hnd.rotation.x = Math.PI / 2;
        hnd.position.set(i % 2 === 0 ? dw / 2 - 25 : -(dw / 2 - 25), 0, 12);
        dr.add(hnd);
      }
    } else if (drawers > 0) {
      const drH = (bodyH - 10) / drawers;
      for (let i = 0; i < drawers; i++)
        addBox(W3 - 10, drH - 6, 18, 0, legH + drH / 2 + 5 + i * drH, halfD + 9, doorMat);
    }
  }

  // Camera
  const maxDim = Math.max(W3, height, depth);
  const camDist = maxDim * 1.75;
  const camera = new THREE.PerspectiveCamera(38, RW / RH, 1, 100000);
  camera.position.set(camDist * 0.7, height * 0.7, camDist * 1.05);
  camera.lookAt(0, height * 0.42, 0);

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.88);

  // Cleanup scene objects
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
  });

  return dataUrl;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const TemplateThumbnail: React.FC<Props> = ({ type, config, name }) => {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    // Slight delay so panels open smoothly before heavy render
    const id = setTimeout(() => {
      const url = renderThumbnail(type, config);
      setSrc(url);
    }, 10);
    return () => clearTimeout(id);
  }, [type, config]);

  if (!src) {
    return (
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: '100%', height: '100%', background: '#0c0e18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 20, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
};

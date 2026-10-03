import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const C = {
  ink: 0x101e29, metal: 0xb5c4cb, copper: 0xba7950,
  cyan: 0x54e0dd, warm: 0xffbb75, white: 0xeee9dd,
};
const isFinitePoint = p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]);
const nativePoint = (p, height = 0) => new THREE.Vector3(-p[0], height, p[1]);
const pos = p => Array.isArray(p) ? p : [p.x, p.y];
const idOf = c => c.groupIndex ?? c.id;

/**
 * A new geometry-based presentation of the original Space Cadet playfield.
 * Native X is reflected to retain the original camera's left/right orientation;
 * world Y is height, and world Z is the engine's downhill table coordinate.
 * This module never advances physics, changes scoring, or fabricates lamp states.
 */
export class ModernTableRenderer {
  constructor(canvas, geometry) {
    this.canvas = canvas;
    this.geometry = geometry;
    this.mode = 'cabinet';
    this.time = 0;
    this.width = 1;
    this.height = 1;
    this.materials = new Set();
    this.textures = new Set();
    this.flippers = new Map();
    this.lamps = new Map();
    this.targets = new Map();
    this.bumpers = new Map();
    this.balls = [];
    this.ballShadows = [];
    this.lastFrames = new Map();
    this.ballRadius = geometry.ball?.radius || 0.3;
    this.bounds = geometry.bounds || { minX: -8, maxX: 8, minY: -14, maxY: 15 };
    this.centerY = (this.bounds.minY + this.bounds.maxY) / 2;
    this.fieldWidth = this.bounds.maxX - this.bounds.minX;
    this.fieldLength = this.bounds.maxY - this.bounds.minY;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 180);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.10;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x07121b, 0);
    this.table = new THREE.Group();
    this.scene.add(this.table);
    this.createMaterials();
    this.createLighting();
    this.createCabinet();
    this.createPlayfield();
    this.createComponents();
    this.createFlippers();
    this.createRamps();
    this.createPlunger();
    this.createBall();
    this.batchLamps();
    this.batchStaticMeshes();
    this.resize(canvas.clientWidth || 600, canvas.clientHeight || 800);
  }

  material(options) {
    const mat = new THREE.MeshStandardMaterial(options);
    this.materials.add(mat);
    return mat;
  }

  createMaterials() {
    this.metal = this.material({ color: C.metal, metalness: 0.88, roughness: 0.23 });
    this.copper = this.material({ color: C.copper, metalness: 0.78, roughness: 0.28 });
    this.graphite = this.material({ color: 0x1d303c, metalness: 0.55, roughness: 0.39 });
    this.dark = this.material({ color: 0x071017, metalness: 0.2, roughness: 0.52 });
    this.rubber = this.material({ color: 0x182027, roughness: 0.65 });
    this.ivory = this.material({ color: C.white, metalness: 0.24, roughness: 0.3 });
    this.cyan = this.material({ color: 0x59b7b8, emissive: C.cyan, emissiveIntensity: 0.7, metalness: 0.22, roughness: 0.32 });
    this.warm = this.material({ color: 0xba7445, emissive: C.warm, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.3 });
  }

  createLighting() {
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(environment, 0.05);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.6;
    environment.dispose();
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xc5e7ef, 0x152234, 1.3));
    const key = new THREE.DirectionalLight(0xe6f1ef, 3.0);
    key.position.set(-8, 23, -4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -13;
    key.shadow.camera.right = 13;
    key.shadow.camera.top = 18;
    key.shadow.camera.bottom = -18;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.015;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x68cace, 1.25);
    fill.position.set(10, 10, -12);
    this.scene.add(fill);
    const warm = new THREE.DirectionalLight(0xfbb684, 0.85);
    warm.position.set(-11, 8, 14);
    this.scene.add(warm);
  }

  addMesh(geometry, material, position, parent = this.table, cast = true) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.copy(position);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  box(w, h, d, x, y, z, material = this.graphite, radius = 0.07, parent) {
    return this.addMesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), material, new THREE.Vector3(x, y, z), parent);
  }

  cylinder(radius, height, x, y, z, material, topRadius = radius, parent) {
    return this.addMesh(new THREE.CylinderGeometry(topRadius, radius, height, 32), material, new THREE.Vector3(x, y, z), parent);
  }

  ring(radius, thickness, x, y, z, material, parent = this.table) {
    const mesh = this.addMesh(new THREE.TorusGeometry(radius, thickness, 8, 48), material, new THREE.Vector3(x, y, z), parent);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  rail(points, radius = 0.075, height = 0.38, material = this.metal, parent = this.table, smooth = false) {
    const p = points.filter(isFinitePoint).map(v => nativePoint(v, v[2] ?? height));
    if (p.length < 2) return;
    const curve = smooth && p.length > 3
      ? new THREE.CatmullRomCurve3(p, false, 'centripetal', 0.15)
      : new THREE.CurvePath();
    if (!(curve instanceof THREE.CatmullRomCurve3)) {
      for (let i = 1; i < p.length; i++) {
        if (p[i].distanceTo(p[i - 1]) > 0.00001) curve.add(new THREE.LineCurve3(p[i - 1], p[i]));
      }
    }
    if (!smooth && !curve.curves.length) return;
    return this.addMesh(new THREE.TubeGeometry(curve, Math.max(2, p.length * 3), radius, 8, false), material, null, parent);
  }

  panel(points, height = 0.35, material = this.graphite, base = 0.0, bevel = 0.035) {
    const p = points.filter(isFinitePoint);
    if (p.length < 3) return;
    const shape = new THREE.Shape();
    shape.moveTo(-p[0][0], -p[0][1]);
    for (let i = 1; i < p.length; i++) shape.lineTo(-p[i][0], -p[i][1]);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: bevel > 0, bevelSegments: 2, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 12 });
    geo.rotateX(-Math.PI / 2);
    const mesh = this.addMesh(geo, material, new THREE.Vector3(0, base, 0));
    return mesh;
  }

  createCabinet() {
    const w = this.fieldWidth;
    const l = this.fieldLength;
    const center = this.centerY;
    this.box(w + 1.25, 0.5, l + 1.05, 0, -1.4, center, this.dark, 0.12);
    for (const x of [-w / 2 - 0.22, w / 2 + 0.22]) {
      this.box(0.65, 0.2, l + 0.45, x, -0.08, center, this.copper, 0.06);
    }
    for (const z of [this.bounds.minY - 0.14, this.bounds.maxY + 0.14]) {
      this.box(w + 0.65, 0.2, 0.4, 0, -0.08, z, this.copper, 0.05);
    }
    const left = -w / 2 - 0.32;
    const right = w / 2 + 0.32;
    this.box(0.4, 0.64, l + 0.7, left, 0.22, center, this.graphite, 0.08);
    this.box(0.4, 0.64, l + 0.7, right, 0.22, center, this.graphite, 0.08);
    this.box(0.14, 0.09, l + 0.65, left, 0.58, center, this.metal, 0.035);
    this.box(0.14, 0.09, l + 0.65, right, 0.58, center, this.metal, 0.035);
    this.box(w + 0.65, 0.55, 0.45, 0, 0.2, this.bounds.minY - 0.25, this.graphite, 0.09);
    this.box(w + 0.7, 0.22, 0.85, 0, 0.15, this.bounds.maxY + 0.08, this.graphite, 0.09);
    this.box(w + 0.4, 0.035, 0.15, 0, 0.29, this.bounds.maxY + 0.12, this.copper, 0.015);
    // Recessed white/cyan rim lights; no bulky glass hides the ball.
    this.box(0.035, 0.035, l - 0.5, left + 0.19, 0.47, center, this.cyan, 0.01);
    this.box(0.035, 0.035, l - 0.5, right - 0.19, 0.47, center, this.cyan, 0.01);
    for (const x of [left, right]) {
      for (let y = this.bounds.minY + 0.7; y < this.bounds.maxY; y += 3.5) {
        this.cylinder(0.075, 0.028, x, 0.636, y, this.metal);
        this.box(0.065, 0.005, 0.012, x, 0.653, y, this.dark, 0.001);
      }
    }
    const glow = this.makeGlowTexture();
    const mat = new THREE.MeshBasicMaterial({ map: glow, transparent: true, opacity: 0.2, depthWrite: false, color: C.cyan, blending: THREE.AdditiveBlending });
    this.materials.add(mat);
    const underglow = this.addMesh(new THREE.PlaneGeometry(w + 6, l + 6), mat, new THREE.Vector3(0, -1.2, center), this.scene, false);
    underglow.rotation.x = -Math.PI / 2;
  }

  createPlayfield() {
    const texture = this.drawArtwork();
    const material = this.material({ color: 0xffffff, map: texture, roughness: 0.34, metalness: 0.18 });
    const shape = new THREE.Shape();
    shape.moveTo(-this.bounds.maxX, -this.bounds.maxY);
    shape.lineTo(-this.bounds.minX, -this.bounds.maxY);
    shape.lineTo(-this.bounds.minX, -this.bounds.minY);
    shape.lineTo(-this.bounds.maxX, -this.bounds.minY);
    shape.closePath();
    const recess = (this.geometry.components || []).find(c => idOf(c) === 103)?.geometry?.polygons?.[0];
    this.launchLane = recess;
    if (recess) {
      // Original launch-path layer uses Z=-1 and overlaps solid ground walls.
      // Present that layer at +1 as an open raised track so its bitmap-era
      // occlusion rules become a coherent 3D assembly. XY remains unchanged.
      this.panel(recess, 0.065, this.graphite, 0.94, 0);
      this.rail([...recess, recess[0]], 0.07, 1.27, this.metal);
      this.rail([...recess, recess[0]], 0.025, 1.015, this.warm);
      this.label('LAUNCH ARRAY', [6.05, 2.6], 1.7, 1.025, '#b4cccb', '600 48px Arial', 0.25);
    }
    const board = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, steps: 1, curveSegments: 8 });
    board.rotateX(-Math.PI / 2);
    this.addMesh(board, this.dark, new THREE.Vector3(0, -0.15, 0));
    const geo = new THREE.ShapeGeometry(shape);
    const positions = geo.attributes.position;
    const uvs = [];
    for (let i = 0; i < positions.count; i++) {
      uvs.push((positions.getX(i) + this.bounds.maxX) / this.fieldWidth, (positions.getY(i) + this.bounds.maxY) / this.fieldLength);
    }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.rotateX(-Math.PI / 2);
    this.addMesh(geo, material, new THREE.Vector3(0, 0.025, 0), this.table, false);
    // Smooth return-lane beds keep subtle depth and contrast beneath real rails.
    for (const x of [-7.0, 6.6]) {
      this.box(1.05, 0.026, 9.3, -x, 0.055, 6.0, this.dark, 0.012);
    }
    this.label('SPACE CADET', [0, 14.25], 5.0, 0.055, '#d8e4e5', '600 48px Arial', 0.48);
    this.label('O R B I T A L   D I V I S I O N   /   0 1', [0, 14.72], 4.4, 0.055, '#89a9b7', '400 26px Arial', 0.23);
  }

  drawArtwork() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = Math.round(canvas.width * this.fieldLength / this.fieldWidth);
    const ctx = canvas.getContext('2d');
    const sx = canvas.width / this.fieldWidth;
    const point = p => [(this.bounds.maxX - p[0]) * sx, (p[1] - this.bounds.minY) * sx];
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#142d38');
    gradient.addColorStop(0.34, '#14313b');
    gradient.addColorStop(0.65, '#101f2b');
    gradient.addColorStop(1, '#152430');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Printed orbital charts and aerospace drawing grid are all resolution independent.
    ctx.strokeStyle = '#68899716';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < canvas.width; x += sx * 0.5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += sx * 0.5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    const strokePath = (points, color, width = 0.03, closed = false) => {
      ctx.beginPath();
      points.forEach((p, i) => { const v = point(p); i ? ctx.lineTo(...v) : ctx.moveTo(...v); });
      if (closed) ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width * sx;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    };
    const circle = (p, radius, color, width = 0.035, dash = []) => {
      ctx.beginPath(); const v = point(p); ctx.arc(...v, radius * sx, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = width * sx; ctx.setLineDash(dash.map(v => v * sx)); ctx.stroke(); ctx.setLineDash([]);
    };
    const text = (str, p, size, color, align = 'center', weight = 500) => {
      ctx.font = `${weight} ${size * sx}px Arial, sans-serif`;
      ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(str, ...point(p));
    };
    // Etched orbital/navigation ring centered on the native mission target.
    for (const r of [2.48, 2.72, 3.1, 3.27]) circle([0, 6], r, r === 3.1 ? '#b17b516f' : '#698c9b42', 0.025);
    circle([0, 6], 2.93, '#72abb04d', 0.03, [0.02, 0.22]);
    for (let i = 0; i < 72; i++) {
      const angle = i * Math.PI * 2 / 72;
      const r0 = i % 6 === 0 ? 2.73 : 2.91;
      strokePath([[Math.cos(angle) * r0, 6 + Math.sin(angle) * r0], [Math.cos(angle) * 3.06, 6 + Math.sin(angle) * 3.06]], '#8aacb958', 0.018);
    }
    // A restrained, original spacecraft illustration replacing the pixelated paint.
    const ship = [[0, 3.8], [-0.26, 4.93], [-1.22, 6.0], [-1.54, 6.93], [-0.45, 6.7], [-0.2, 7.05], [0, 6.88], [0.2, 7.05], [0.45, 6.7], [1.54, 6.93], [1.22, 6.0], [0.26, 4.93]];
    const shipPath = new Path2D(); ship.forEach((p, i) => { const v = point(p); i ? shipPath.lineTo(...v) : shipPath.moveTo(...v); }); shipPath.closePath();
    const shipGradient = ctx.createLinearGradient(0, point([0, 3.8])[1], 0, point([0, 7])[1]);
    shipGradient.addColorStop(0, '#b7d0d72d'); shipGradient.addColorStop(1, '#618da515'); ctx.fillStyle = shipGradient; ctx.fill(shipPath);
    strokePath(ship, '#94b8c56a', 0.035, true);
    strokePath([[0, 3.8], [0, 6.87]], '#94b8c54c', 0.025);
    strokePath([[-0.26, 4.93], [-0.35, 6.4], [-1.54, 6.93]], '#94b8c54c', 0.025);
    strokePath([[0.26, 4.93], [0.35, 6.4], [1.54, 6.93]], '#94b8c54c', 0.025);
    strokePath([[-0.15, 7.15], [-0.32, 7.7], [0, 7.48], [0.32, 7.7], [0.15, 7.15]], '#c28d5961', 0.035);
    text('MISSION CONTROL', [0, 8.05], 0.28, '#b8d0d696', 'center', 700);
    text('EXPLORATION // 1995', [0, 8.46], 0.14, '#7b9caa91');
    // The large attack-bumper orbital graphic and directional striping.
    circle([0, -5.5], 3.1, '#4ea2ad47', 0.03);
    circle([0, -5.5], 3.28, '#6d9ca02f', 0.04, [0.05, 0.18]);
    text('ATTACK ARRAY', [0.2, -7.67], 0.27, '#c2d3d0a1', 'center', 700);
    text('DEEP SPACE OPERATIONS', [0.1, -8.02], 0.14, '#7cacbb9c');
    text('SPACE', [-0.25, -0.68], 1.1, '#aec6cc25', 'center', 800);
    text('CADET', [-0.25, 0.31], 1.1, '#aec6cc25', 'center', 800);
    text('HYPERSPACE', [-4.8, -3.8], 0.23, '#79bfc2b2', 'center', 600);
    text('WORMHOLE', [4.2, -10.7], 0.2, '#c99b68bd', 'center', 700);
    text('LAUNCH', [-6.85, 6.1], 0.2, '#a9c1c492', 'center', 700);
    text('FUEL', [-4.7, -2.0], 0.18, '#bf926da9', 'center', 600);
    text('RE-ENTRY', [0, -11.35], 0.2, '#bdcece9c', 'center', 600);
    // Avoid decorative collisions: these circuit lines are ink on the flat playfield.
    const circuits = [
      [[4.8, 4.6], [4.8, 1.4], [4.4, 0.7], [4.4, -1.0]],
      [[-4.5, 4.4], [-4.5, 2.9], [-3.7, 2.2], [-3.7, 1.1]],
      [[-2.8, 9.1], [-1.9, 10.3], [-1.9, 10.8]],
      [[2.8, 9.1], [1.9, 10.3], [1.9, 10.8]],
    ];
    circuits.forEach(line => strokePath(line, '#b0825752', 0.027));
    for (const c of this.geometry.components || []) {
      if (!['wall', 'rebounder'].includes(c.type) && ![1000, 1010].includes(c.typeId)) continue;
      const polys = c.geometry?.polygons || [];
      for (const polygon of polys) {
        if (polygon.length < 3) continue;
        const path = new Path2D(); polygon.forEach((p, i) => { const v = point(p); i ? path.lineTo(...v) : path.moveTo(...v); }); path.closePath();
        ctx.fillStyle = '#050c1150'; ctx.fill(path);
      }
    }
    // Deterministic fine printing, not pixel art. Texture remains crisp under zoom.
    let seed = 1995;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 240; i++) {
      const x = rnd() * canvas.width, y = rnd() * canvas.height, r = rnd() * 1.4 + 0.45;
      ctx.fillStyle = `rgba(193,219,222,${rnd() * 0.3 + 0.05})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    this.textures.add(texture);
    return texture;
  }

  label(str, p, width, height = 0.06, color = '#dce7e6', font = '600 48px Arial', depth = width / 7, parent = this.table) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = Math.max(64, Math.round(1024 * depth / width));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const originalSize = Number((font.match(/([\d.]+)px/) || [0, 48])[1]);
    const measuredWidth = ctx.measureText(str).width;
    const size = Math.min(canvas.height * 0.70, originalSize * canvas.width * 0.9 / Math.max(1, measuredWidth));
    ctx.font = font.replace(/[\d.]+px/, `${size}px`);
    ctx.fillText(str, canvas.width / 2, canvas.height / 2, canvas.width - 30);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    this.textures.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    this.materials.add(material);
    const mesh = this.addMesh(new THREE.PlaneGeometry(width, depth), material, nativePoint(p, height), parent, false);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  makeGlowTexture() {
    if (this.glowTexture) return this.glowTexture;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0.75)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.38)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.07)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    this.glowTexture = new THREE.CanvasTexture(canvas); this.textures.add(this.glowTexture);
    return this.glowTexture;
  }

  glow(p, radius, color = C.cyan, height = 0.06, opacity = 0.3) {
    const material = new THREE.MeshBasicMaterial({ color, map: this.makeGlowTexture(), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    this.materials.add(material);
    const mesh = this.addMesh(new THREE.PlaneGeometry(radius * 4, radius * 4), material, nativePoint(p, height), this.table, false);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  createComponents() {
    for (const c of this.geometry.components || []) {
      const g = c.geometry || {};
      const type = c.typeId;
      if (type === 1002 || c.type === 'light') { this.createLamp(c); continue; }
      if (type === 1005 || c.type === 'bumper') { this.createBumper(c); continue; }
      if ([1003, 1004, 1001, 1007, 1021].includes(type)) continue;
      const elevated = g.z > 0 ? g.z : (g.height > 0 ? g.height : 0);
      if ([1000, 1010].includes(type) || ['wall', 'rebounder'].includes(c.type)) {
        const isSling = /^v_rebo[12]$/.test(c.name || '');
        // Group 103 has its own launch-track assembly. Group 106 is a concealed
        // return chute and has no above-board mesh.
        if ([103, 106].includes(Number(idOf(c)))) continue;
        const base = elevated;
        for (const polygon of g.polygons || []) {
          // Design polygons include the repeated closing vertex. Slim panels stay
          // inside actual native wall outlines, while chrome follows their edges.
          this.panel(polygon, isSling ? 0.22 : 0.26, isSling ? this.graphite : this.dark, base, 0.02);
          this.rail([...polygon, polygon[0]], 0.065, base + 0.32, isSling ? this.copper : this.metal);
          if (isSling) {
            this.rail([polygon[0], polygon[polygon.length - 2] || polygon[1]], 0.028, base + 0.35, this.cyan);
          }
        }
        if (!(g.polygons || []).length) {
          for (const line of g.lines || []) {
            this.rail([[line[0], line[1]], [line[2], line[3]]], 0.06, base + 0.28);
            this.rail([[line[0], line[1]], [line[2], line[3]]], 0.07, base + 0.11, this.rubber);
          }
        }
        for (const circle of g.circles || []) {
          const p = circle.center;
          if (!isFinitePoint(p) || circle.radius < 0.02) continue;
          this.cylinder(circle.radius, 0.33, -p[0], base + 0.19, p[1], this.graphite);
          this.ring(circle.radius, 0.045, -p[0], base + 0.36, p[1], this.metal);
        }
        continue;
      }
      if ([1006, 1019].includes(type) || ['popupTarget', 'soloTarget', 'target'].includes(c.type)) {
        this.createTarget(c); continue;
      }
      if ([1012, 1022, 1029].includes(type) || ['kickout', 'hole'].includes(c.type)) {
        this.createScoop(c); continue;
      }
      if (type === 1018 || c.type === 'spinner') { this.createSpinner(c); continue; }
      if ([1013, 1014, 1017].includes(type)) {
        for (const line of g.lines || []) {
          this.rail([[line[0], line[1]], [line[2], line[3]]], 0.05, 0.4, this.copper);
          for (const p of [[line[0], line[1]], [line[2], line[3]]]) this.cylinder(0.1, 0.5, -p[0], 0.28, p[1], this.metal);
        }
      }
      // Rollovers/one-way planes/tripwires are sensors, not additional solid rails.
      if ([1015, 1020, 1024].includes(type)) {
        const polygon = g.polygons?.[0];
        if (polygon) this.rail([...polygon, polygon[0]], 0.015, 0.055, this.copper);
      }
    }
  }

  createBumper(c) {
    const circle = c.geometry?.circles?.[0];
    if (!circle || !isFinitePoint(circle.center)) return;
    const p = circle.center;
    const r = circle.radius || 0.35;
    const isLaunch = Number(idOf(c)) >= 405;
    const h = isLaunch ? 1.0 : 0;
    const color = isLaunch ? C.warm : C.cyan;
    this.cylinder(r + 0.16, 0.08, -p[0], h + 0.11, p[1], this.dark);
    this.cylinder(r + 0.05, 0.25, -p[0], h + 0.28, p[1], this.metal);
    this.ring(r + 0.075, 0.058, -p[0], h + 0.2, p[1], this.rubber);
    const group = new THREE.Group(); group.position.copy(nativePoint(p, h)); this.table.add(group);
    this.cylinder(r + 0.14, 0.14, 0, 0.6, 0, this.graphite, r + 0.11, group);
    this.ring(r + 0.1, 0.027, 0, 0.685, 0, this.metal, group);
    const mat = this.material({ color: isLaunch ? 0xbb956a : 0x739f9b, emissive: color, emissiveIntensity: 0.25, roughness: 0.24, metalness: 0.35 });
    this.cylinder(r * 0.78, 0.025, 0, 0.69, 0, mat, r * 0.78, group);
    this.ring(r + 0.025, 0.04, 0, 0.6, 0, isLaunch ? this.warm : this.cyan, group);
    const text = isLaunch ? 'L' : 'A';
    this.label(text, [0, 0], r * 0.7, 0.71, '#182e36', '700 80px Arial', r * 0.65, group);
    const glow = this.glow(p, r + 0.14, color, h + 0.07, 0.2);
    this.bumpers.set(idOf(c), { group, mat, glow, pulse: 0, h });
  }

  createLamp(c) {
    const g = c.geometry || {};
    const p = c.position ? pos(c.position) : (g.position ? pos(g.position) : c.center ? pos(c.center) : null);
    if (!isFinitePoint(p)) return;
    const name = c.name || '';
    const amber = /lite(?:1[6-9]|2[0-9]|3[08-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|1[34][0-9]|3[0-9]{2})$/.test(name);
    const color = amber ? C.warm : C.cyan;
    const r = Math.max(0.10, Math.min(0.26, g.radius || c.radius || 0.14));
    const h = this.isInLaunchLane(p) ? 1.06 : (Number.isFinite(c.z) ? Math.max(0.04, c.z) : (g.z > 0 ? g.z : 0.06));
    this.cylinder(r + 0.032, 0.024, -p[0], h, p[1], this.metal);
    const mat = this.material({ color: amber ? 0x604630 : 0x244248, emissive: color, emissiveIntensity: 0.01, roughness: 0.28, metalness: 0.25 });
    const mesh = this.cylinder(r, 0.025, -p[0], h + 0.018, p[1], mat);
    mesh.castShadow = false;
    const glow = this.glow(p, r * 1.4, color, h + 0.035, 0);
    this.lamps.set(idOf(c), { mat, mesh, glow, radius: r, value: 0, color: new THREE.Color(amber ? 0xffbc72 : 0x72efea), off: new THREE.Color(amber ? 0x604630 : 0x244248) });
  }

  createTarget(c) {
    const poly = c.geometry?.polygons?.[0];
    const line = c.geometry?.lines?.[0];
    let p, length, angle;
    if (poly?.length) {
      const a = poly[0], b = poly[2] || poly[1];
      p = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const pair = poly.reduce((best, v, i) => {
        const u = poly[(i + 1) % poly.length], distance = Math.hypot(u[0] - v[0], u[1] - v[1]);
        return distance > best.distance ? { a: v, b: u, distance } : best;
      }, { distance: 0 });
      length = Math.min(pair.distance, 0.9);
      angle = -Math.atan2(pair.b[1] - pair.a[1], -(pair.b[0] - pair.a[0]));
    } else if (line) {
      p = [(line[0] + line[2]) / 2, (line[1] + line[3]) / 2];
      length = Math.hypot(line[2] - line[0], line[3] - line[1]);
      angle = -Math.atan2(line[3] - line[1], -(line[2] - line[0]));
    }
    if (!isFinitePoint(p)) return;
    const group = new THREE.Group(); group.position.copy(nativePoint(p)); group.rotation.y = angle; this.table.add(group);
    this.box(length + 0.12, 0.16, 0.26, 0, 0.09, 0, this.dark, 0.03, group);
    const mat = this.material({ color: 0xe0af7a, emissive: 0xc88946, emissiveIntensity: 0.09, roughness: 0.35, metalness: 0.25 });
    const face = this.box(Math.max(0.1, length - 0.035), 0.35, 0.13, 0, 0.26, 0, mat, 0.028, group);
    this.box(Math.max(0.12, length - 0.08), 0.025, 0.016, 0, 0.39, 0.08, this.ivory, 0.004, group);
    this.targets.set(idOf(c), { group, face, mat, popup: c.typeId === 1006 });
  }

  createScoop(c) {
    const circle = c.geometry?.circles?.[0];
    if (!circle || !isFinitePoint(circle.center)) return;
    const p = circle.center;
    if (idOf(c) === 510) return; // Native mission trigger's 3.2-unit field is flat.
    const radius = Math.min(0.5, Math.max(0.23, circle.radius));
    const h = idOf(c) === 104 ? 1.035 : 0.035;
    this.cylinder(radius, 0.035, -p[0], h, p[1], this.dark);
    this.ring(radius, 0.065, -p[0], h + 0.035, p[1], this.copper);
    this.ring(radius * 0.8, 0.022, -p[0], h + 0.045, p[1], this.cyan);
    this.glow(p, radius * 0.85, C.cyan, h + 0.028, 0.12);
  }

  createSpinner(c) {
    const line = c.geometry?.lines?.[0];
    if (!line) return;
    const a = [line[0], line[1]], b = [line[2], line[3]];
    const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    this.rail([a, b], 0.025, 0.53, this.metal);
    for (const p of [a, b]) this.cylinder(0.08, 0.62, -p[0], 0.31, p[1], this.metal);
    const group = new THREE.Group(); group.position.copy(nativePoint(midpoint, 0.43));
    group.rotation.y = -Math.atan2(b[1] - a[1], -(b[0] - a[0])); this.table.add(group);
    const mesh = this.box(0.34, 0.42, 0.028, 0, 0, 0, this.copper, 0.012, group);
    this.targets.set(idOf(c), { group, face: mesh, spinner: true });
  }

  createFlippers() {
    for (const f of this.geometry.flippers || []) {
      const pivot = pos(f.pivot), tip = pos(f.restTip);
      if (!isFinitePoint(pivot) || !isFinitePoint(tip)) continue;
      const length = Math.hypot(tip[0] - pivot[0], tip[1] - pivot[1]);
      const r0 = f.baseRadius || 0.311, r1 = f.tipRadius || 0.193;
      const shape = this.flipperShape(length, r0, r1);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3, curveSegments: 24 });
      geo.rotateX(-Math.PI / 2);
      const group = new THREE.Group(); group.position.copy(nativePoint(pivot, 0.11)); this.table.add(group);
      this.addMesh(geo, this.copper, null, group);
      const insert = new THREE.ExtrudeGeometry(this.flipperShape(length, Math.max(0.08, r0 - 0.07), Math.max(0.07, r1 - 0.06)), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 20 });
      insert.rotateX(-Math.PI / 2);
      this.addMesh(insert, this.ivory, new THREE.Vector3(0, 0.19, 0), group);
      this.cylinder(0.1, 0.025, 0, 0.264, 0, this.metal, 0.1, group);
      this.label('CADET', [-length * 0.48, 0], length * 0.46, 0.266, '#344b51', '700 62px Arial', 0.16, group);
      const orientation = -Math.atan2(tip[1] - pivot[1], -(tip[0] - pivot[0]));
      group.rotation.y = orientation;
      this.flippers.set(idOf(f), { group, pivot, tip, orientation });
    }
  }

  flipperShape(length, r0, r1) {
    const shape = new THREE.Shape();
    const angle = Math.acos(THREE.MathUtils.clamp((r0 - r1) / length, -1, 1));
    shape.moveTo(r0 * Math.cos(angle), r0 * Math.sin(angle));
    shape.lineTo(length + r1 * Math.cos(angle), r1 * Math.sin(angle));
    shape.absarc(length, 0, r1, angle, -angle, true);
    shape.lineTo(r0 * Math.cos(-angle), r0 * Math.sin(-angle));
    shape.absarc(0, 0, r0, -angle, angle - Math.PI * 2, true);
    shape.closePath();
    return shape;
  }

  createRamps() {
    for (const ramp of this.geometry.ramps || []) {
      if (ramp.name === 's_ramp9' || idOf(ramp) === 105) continue; // subterranean return chute
      const triangles = ramp.triangles || ramp.geometry?.triangles || ramp.planes?.map(p => p.vertices3D) || [];
      if (!triangles.length) continue;
      const verts = [], boundary = new Map();
      for (const triangle of triangles) {
        const t = Array.isArray(triangle) ? triangle : triangle.vertices;
        if (!t || t.length < 3) continue;
        const p = t.slice(0, 3).map(v => Array.isArray(v) ? v : [v.x, v.y, v.z]);
        p.forEach(v => verts.push(-v[0], (v[2] || 0) + 0.025, v[1]));
        for (let i = 0; i < 3; i++) {
          const a = p[i], b = p[(i + 1) % 3];
          const key = [a.slice(0, 2).map(v => v.toFixed(4)).join(','), b.slice(0, 2).map(v => v.toFixed(4)).join(',')].sort().join('|');
          const existing = boundary.get(key);
          boundary.set(key, existing ? { ...existing, count: existing.count + 1 } : { a, b, count: 1 });
        }
      }
      if (!verts.length) continue;
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.computeVertexNormals();
      const mat = this.material({ color: 0x7b959d, metalness: 0.72, roughness: 0.32, side: THREE.DoubleSide });
      this.addMesh(geo, mat);
      for (const { a, b, count } of boundary.values()) {
        if (count !== 1) continue;
        this.rail([[a[0], a[1], (a[2] || 0) + 0.12], [b[0], b[1], (b[2] || 0) + 0.12]], 0.055);
      }
    }
  }

  createPlunger() {
    const c = (this.geometry.components || []).find(c => c.typeId === 1001 || c.type === 'plunger');
    const p = this.geometry.plunger?.start || (c?.position ? pos(c.position) : [-7.021, 10.085]);
    this.plunger = new THREE.Group(); this.plunger.position.copy(nativePoint([p[0], 12.25], 0.27)); this.table.add(this.plunger);
    this.box(0.72, 0.2, 0.29, 0, 0, 0, this.copper, 0.055, this.plunger);
    const shaft = this.addMesh(new THREE.CylinderGeometry(0.065, 0.065, 1.45, 12), this.metal, new THREE.Vector3(0, 0, 0.63), this.plunger);
    shaft.rotation.x = Math.PI / 2;
    const helix = [];
    for (let i = 0; i <= 140; i++) {
      const theta = i * Math.PI * 2 / 14;
      helix.push(new THREE.Vector3(Math.cos(theta) * 0.15, Math.sin(theta) * 0.15, i / 140 * 1.15 + 0.1));
    }
    this.addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 160, 0.022, 5, false), this.metal, null, this.plunger);
    this.plungerRest = this.plunger.position.z;
  }

  isInLaunchLane(point) {
    const polygon = this.launchLane;
    if (!polygon) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  batchStaticMeshes() {
    const staticMaterials = [this.metal, this.copper, this.graphite, this.dark, this.rubber, this.ivory, this.cyan, this.warm];
    this.table.updateMatrixWorld(true);
    for (const material of staticMaterials) {
      const meshes = this.table.children.filter(o => o.isMesh && o.material === material);
      if (meshes.length < 2) continue;
      const geometries = meshes.map(mesh => {
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrix);
        geometry.clearGroups();
        return geometry;
      });
      const merged = mergeGeometries(geometries);
      geometries.forEach(geometry => geometry.dispose());
      if (!merged) continue;
      const mesh = this.addMesh(merged, material);
      mesh.name = 'static-' + material.uuid;
      for (const original of meshes) { this.table.remove(original); original.geometry.dispose(); }
    }
  }

  batchLamps() {
    const lamps = [...this.lamps.values()];
    if (!lamps.length) return;
    const geometry = new THREE.CylinderGeometry(1, 1, 1, 24);
    const levels = new THREE.InstancedBufferAttribute(new Float32Array(lamps.length), 1);
    geometry.setAttribute('lampLevel', levels);
    const material = this.material({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.75, roughness: 0.28, metalness: 0.25 });
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float lampLevel;\nvarying float vLampLevel;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('void main() {', 'void main() {\nvLampLevel = lampLevel;');
      shader.fragmentShader = 'varying float vLampLevel;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vLampLevel;');
    };
    this.lampInstances = new THREE.InstancedMesh(geometry, material, lamps.length);
    this.lampInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.lampLevels = levels;
    this.table.add(this.lampInstances);
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, map: this.makeGlowTexture(), transparent: true, opacity: 0.43, blending: THREE.AdditiveBlending, depthWrite: false });
    this.materials.add(glowMaterial);
    this.lampGlowInstances = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial, lamps.length);
    this.lampGlowInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.table.add(this.lampGlowInstances);
    const matrix = new THREE.Matrix4();
    const transform = new THREE.Object3D();
    lamps.forEach((lamp, index) => {
      transform.position.copy(lamp.mesh.position);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(lamp.radius, 0.025, lamp.radius);
      transform.updateMatrix(); matrix.copy(transform.matrix);
      this.lampInstances.setMatrixAt(index, matrix);
      this.lampInstances.setColorAt(index, lamp.off);
      transform.position.copy(lamp.glow.position);
      transform.rotation.copy(lamp.glow.rotation);
      transform.scale.set(lamp.radius * 5.6, lamp.radius * 5.6, 1);
      transform.updateMatrix();
      this.lampGlowInstances.setMatrixAt(index, transform.matrix);
      this.lampGlowInstances.setColorAt(index, new THREE.Color(0));
      for (const mesh of [lamp.mesh, lamp.glow]) {
        this.table.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); this.materials.delete(mesh.material);
      }
      lamp.index = index;
      delete lamp.mesh; delete lamp.glow; delete lamp.mat;
    });
    this.lampInstances.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.lampGlowInstances.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }

  createBall() {
    const mat = this.material({ color: 0xe6eeee, metalness: 1, roughness: 0.075, envMapIntensity: 1.8 });
    const ball = this.addMesh(new THREE.SphereGeometry(this.ballRadius, 32, 24), mat, new THREE.Vector3(7.021, this.ballRadius, 10.085));
    ball.visible = false;
    this.balls.push(ball);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000208, map: this.makeGlowTexture(), transparent: true, opacity: 0.8, depthWrite: false });
    this.materials.add(shadowMat);
    const shadow = this.addMesh(new THREE.PlaneGeometry(this.ballRadius * 4, this.ballRadius * 4), shadowMat, new THREE.Vector3(0, 0.045, 0), this.table, false);
    shadow.rotation.x = -Math.PI / 2; shadow.visible = false; this.ballShadows.push(shadow);
  }

  resize(width, height) {
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.frameCamera();
  }

  setSize(width, height) { this.resize(width, height); }

  setCamera(mode) {
    this.mode = mode === 'overhead' ? 'overhead' : 'cabinet';
    this.frameCamera();
  }

  frameCamera() {
    const overhead = this.mode === 'overhead';
    const direction = overhead ? new THREE.Vector3(0, 1, 0.001) : new THREE.Vector3(0, 1, 0.59).normalize();
    const target = new THREE.Vector3(0, 0, this.centerY + (overhead ? 0 : 1.0));
    const verticalSpan = overhead ? this.fieldLength + 2 : (this.fieldLength + 2) * direction.y + 2;
    const horizontalSpan = this.fieldWidth + 2;
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    let distance = Math.max(verticalSpan / 2 / Math.tan(halfFov), horizontalSpan / 2 / this.camera.aspect / Math.tan(halfFov));
    this.camera.up.set(0, overhead ? 0 : 1, overhead ? -1 : 0);
    this.camera.updateProjectionMatrix();
    const corners = [];
    for (const x of [-this.fieldWidth / 2 - 0.7, this.fieldWidth / 2 + 0.7]) {
      for (const z of [this.bounds.minY - 0.7, this.bounds.maxY + 0.7]) {
        for (const h of [-1.65, 0.7]) corners.push(new THREE.Vector3(x, h, z));
      }
    }
    // Fit the real cabinet in either aspect ratio, including perspective depth.
    for (let i = 0; i < 5; i++) {
      this.camera.position.copy(target).addScaledVector(direction, distance);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld(true);
      const extent = corners.reduce((max, v) => { const p = v.clone().project(this.camera); return Math.max(max, Math.abs(p.x), Math.abs(p.y)); }, 0);
      distance *= extent / 0.925;
    }
    this.camera.position.copy(target).addScaledVector(direction, distance);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
  }

  update(state, dt = 1 / 60) {
    this.time += Math.min(dt, 0.1);
    if (state) {
      const balls = state.balls || [];
      for (let i = 0; i < balls.length; i++) {
        if (!this.balls[i]) this.createBall();
        const b = balls[i], mesh = this.balls[i], shadow = this.ballShadows[i];
        mesh.visible = !!b.active;
        shadow.visible = !!b.active && b.z >= -1.0;
        if (!b.active) continue;
        const inLaunchLayer = b.z < -0.1 && b.z > -2 && this.isInLaunchLane([b.x, b.y]);
        const height = (Number.isFinite(b.z) ? b.z : this.ballRadius) + (inLaunchLayer ? 2 : 0);
        mesh.position.set(-b.x, height + 0.025, b.y);
        const radius = b.radius || this.ballRadius;
        mesh.scale.setScalar(radius / this.ballRadius);
        mesh.rotation.x += (b.vy || 0) * dt / radius;
        mesh.rotation.z += (b.vx || 0) * dt / radius;
        const surface = inLaunchLayer ? 1 : Math.max(0, b.z - radius);
        shadow.position.set(-b.x, surface + 0.048, b.y);
        shadow.material.opacity = THREE.MathUtils.clamp(0.9 - Math.max(0, b.z - radius) * 0.14, 0.12, 0.9);
      }
      for (let i = balls.length; i < this.balls.length; i++) { this.balls[i].visible = false; this.ballShadows[i].visible = false; }
      for (const f of state.flippers || []) {
        const data = this.flippers.get(idOf(f));
        if (!data) continue;
        if (f.tip && f.pivot) {
          const pivot = pos(f.pivot), tip = pos(f.tip);
          data.group.position.x = -pivot[0]; data.group.position.z = pivot[1];
          data.group.rotation.y = -Math.atan2(tip[1] - pivot[1], -(tip[0] - pivot[0]));
        } else data.group.rotation.y = data.orientation + (f.angle || 0);
      }
      for (const l of state.lights || []) {
        const lamp = this.lamps.get(idOf(l));
        if (!lamp) continue;
        const goal = l.on ? 1 : 0;
        lamp.value += (goal - lamp.value) * Math.min(1, dt * 28);
        this.lampInstances.setColorAt(lamp.index, lamp.off.clone().lerp(lamp.color, lamp.value * 0.68));
        this.lampGlowInstances.setColorAt(lamp.index, lamp.color.clone().multiplyScalar(lamp.value));
        this.lampLevels.setX(lamp.index, lamp.value);
      }
      this.lampInstances.instanceColor.needsUpdate = true;
      this.lampGlowInstances.instanceColor.needsUpdate = true;
      this.lampLevels.needsUpdate = true;
      for (const c of state.components || []) {
        const id = idOf(c), last = this.lastFrames.get(id);
        const bumper = this.bumpers.get(id);
        if (bumper && last !== undefined && c.frame !== last && c.frame % 2 === 1) bumper.pulse = 1;
        const target = this.targets.get(id);
        if (target?.popup) target.face.position.y = c.active ? 0.26 : 0.04;
        if (target?.spinner && last !== undefined && c.frame !== last) target.face.rotation.x += Math.PI / 4;
        this.lastFrames.set(id, c.frame);
      }
      this.plunger.position.z = this.plungerRest + (state.plungerCharge || 0) * 0.55;
    }
    for (const bumper of this.bumpers.values()) {
      bumper.pulse = Math.max(0, bumper.pulse - dt * 4.5);
      bumper.group.position.y = bumper.h + bumper.pulse * 0.08;
      bumper.mat.emissiveIntensity = 0.25 + bumper.pulse * 2;
      bumper.glow.material.opacity = 0.2 + bumper.pulse * 0.4;
    }
    this.renderer.render(this.scene, this.camera);
  }

  render(state) { this.update(state); }

  dispose() {
    const geometries = new Set();
    this.scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
    geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
    this.textures.forEach(texture => texture.dispose());
    this.envTarget?.dispose();
    this.renderer.dispose();
  }
}

export default ModernTableRenderer;

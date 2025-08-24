// script.js
let scene, camera, renderer, controls, raycaster, mouse, tooltip;
let stars = [], starMeshes = [];
const STAR_SIZE_SCALE = 1000; // global scale factor for star sizes (further increased for even bigger stars)
const constellations = [];
let selectedStars = [];
let drawingMode = false;
init();
loadStars();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 10000);
  camera.position.set(0, 0, 1000); 
  
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000); 
  document.body.appendChild(renderer.domElement);
  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.background = "rgba(20,20,30,0.9)";
  tooltip.style.padding = "8px 12px";
  tooltip.style.borderRadius = "8px";
  tooltip.style.color = "#fff";
  tooltip.style.fontSize = "14px";
  tooltip.style.display = "none";
  tooltip.style.pointerEvents = "none";
  tooltip.style.border = "1px solid rgba(255,255,255,0.2)";
  document.body.appendChild(tooltip);
  
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick);

  // Create UI panel with buttons
  const uiPanel = document.createElement("div");
  uiPanel.style.position = "fixed";
  uiPanel.style.top = "10px";
  uiPanel.style.left = "10px";
  uiPanel.style.zIndex = "100";
  uiPanel.style.background = "rgba(0,0,0,0.5)";
  uiPanel.style.padding = "10px";
  uiPanel.style.borderRadius = "8px";
  uiPanel.style.display = "flex";
  uiPanel.style.gap = "10px";

  const drawBtn = document.createElement("button");
  drawBtn.textContent = "Draw Constellations!!";
  drawBtn.style.cursor = "pointer";
  drawBtn.onclick = () => {
    drawingMode = !drawingMode;
    drawBtn.style.backgroundColor = drawingMode ? "#4caf50" : "";
  };
  uiPanel.appendChild(drawBtn);

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  clearBtn.style.cursor = "pointer";
  clearBtn.onclick = () => {
    clearConstellations();
  };
  uiPanel.appendChild(clearBtn);

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export PNG";
  exportBtn.style.cursor = "pointer";
  exportBtn.onclick = () => {
    exportPNG();
  };
  uiPanel.appendChild(exportBtn);

  document.body.appendChild(uiPanel);
}

function addConstellation(star1, star2) {
  const points = [];
  points.push(star1.position.clone());
  points.push(star2.position.clone());

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
  const line = new THREE.Line(geometry, material);

  scene.add(line);
  constellations.push(line);
}

function clearConstellations() {
  for (const line of constellations) {
    scene.remove(line);
  }
  constellations.length = 0;
}

function exportPNG() {
  const dataURL = renderer.domElement.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "constellation.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function onClick(event) {
  if (!drawingMode) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && (!obj.userData || !obj.userData.source_id)) {
      obj = obj.parent;
    }
    if (obj) {
      selectedStars.push(obj);
      console.log("Selected star data:", obj.userData);
      if (selectedStars.length === 2) {
        addConstellation(selectedStars[0], selectedStars[1]);
        selectedStars = [];
      }
    }
  }
}

function getStarColor(bp_rp, teff) {
  if (bp_rp != null) {
    if (bp_rp < 0) return 0xaabfff;       // blue
    if (bp_rp < 0.8) return 0xffffff;     // white
    if (bp_rp < 1.5) return 0xffd2a1;     // yellowish
    if (bp_rp < 2.5) return 0xffcc6f;     // orange
    return 0xff6f6f;                      // red
  }
  if (teff != null) {
    if (teff > 10000) return 0xaabfff;
    if (teff > 7500) return 0xffffff;
    if (teff > 5500) return 0xffd2a1;
    if (teff > 4000) return 0xffcc6f;
    return 0xff6f6f;
  }
  return 0xffffff;
}

function getColorName(value) {
  switch (value) {
    case 0xaabfff: return "Blue";
    case 0xffffff: return "White";
    case 0xffd2a1: return "Yellow";
    case 0xffcc6f: return "Orange";
    case 0xff6f6f: return "Red";
    default: return "Unknown";
  }
}

function normalizeKeys(obj) {
  const normalized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      normalized[key.trim().toLowerCase()] = obj[key];
    }
  }
  return normalized;
}

function loadStars() {
  Papa.parse("Kepler-902 b.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: (results) => {
       
      // Normalize each record's keys
      const normalizedData = results.data.map(record => normalizeKeys(record));

      stars = normalizedData.filter(s =>
        s.x !== null && s.x !== undefined &&
        s.y !== null && s.y !== undefined &&
        s.z !== null && s.z !== undefined &&
        s.source_id !== null && s.source_id !== undefined
      );
      console.log("CSV headers:", Object.keys(normalizedData[0]));
      console.log("First star:", normalizedData[0]);
      console.log("Normalized keys:", Object.keys(stars[0]));
      
      // Calculate bounds to center the data
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      
      stars.forEach(star => {
        minX = Math.min(minX, star.x);
        maxX = Math.max(maxX, star.x);
        minY = Math.min(minY, star.y);
        maxY = Math.max(maxY, star.y);
        minZ = Math.min(minZ, star.z);
        maxZ = Math.max(maxZ, star.z);
      });
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      
      stars.forEach(star => {
        if (starMeshes.length < 5) {
          console.log("Star record:", star);
        }
        const color = getStarColor(star.colour, star.temperature);
        // Temporarily force radius to 50 for testing click selection
        const radius = 50;

        const geom = new THREE.SphereGeometry(radius, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9
        });
        const mesh = new THREE.Mesh(geom, mat);

      
        const glowMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.35
        });
        const glowGeom = new THREE.SphereGeometry(radius * 1.8, 16, 16);
        const glowMesh = new THREE.Mesh(glowGeom, glowMat);
        mesh.add(glowMesh);

        const scale = 100; 
        mesh.position.set(
          (star.x - centerX) * scale,
          (star.y - centerY) * scale,
          (star.z - centerZ) * scale
        );

        // Store a copy of the normalized star record for tooltip display, including colorHex
        mesh.userData = { ...star, colorHex: color };

        scene.add(mesh);
        starMeshes.push(mesh);
      });
      
      console.log(`Loaded ${starMeshes.length} stars`);
      console.log(`Data bounds: X(${minX.toFixed(2)}, ${maxX.toFixed(2)}), Y(${minY.toFixed(2)}, ${maxY.toFixed(2)}), Z(${minZ.toFixed(2)}, ${maxZ.toFixed(2)})`);
    }
  });
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes, true);
  
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && (!obj.userData || !obj.userData.source_id)) {
      obj = obj.parent;
    }
    const data = obj ? obj.userData : null;
    if (data) {
      console.log("Hovered star data:", data);
      tooltip.style.display = "block";
      tooltip.style.left = event.clientX + 15 + "px";
      tooltip.style.top = event.clientY - 10 + "px";
      // Build a fixed format tooltip
      function showField(label, value) {
        return `<strong>${label}:</strong> ${value !== undefined && value !== null && value !== "" ? value : "N/A"}<br>`;
      }
      let html = "";
      html += showField("Gaia ID", data.source_id);
      html += showField("Stellar Radius", data.stellar_radius);
      const colorName = getColorName(data.colorHex);
      html += `<strong>Colour:</strong> ${colorName} (0x${data.colorHex.toString(16).padStart(6, '0')})<br>`;
      html += showField("Temperature", data.temperature);
      html += showField("Lifestage", data.lifestage);
      tooltip.innerHTML = html;
    } else {
      tooltip.style.display = "none";
    }
  } else {
    tooltip.style.display = "none";
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
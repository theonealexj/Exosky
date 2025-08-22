// script.js
let scene, camera, renderer, controls, raycaster, mouse, tooltip;
let stars = [], starMeshes = [];
const STAR_SIZE_SCALE = 200; // global scale factor for star sizes (further increased for even bigger stars)
init();
loadStars();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 10000);
  camera.position.set(0, 0, 1000); // Better initial position
  
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000); // Pure black background
  document.body.appendChild(renderer.domElement);
  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableRotate = true;   // allow rotation
  controls.enablePan = true;      // allow panning
  controls.enableZoom = true;     // allow zooming
  
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

function loadStars() {
  Papa.parse("Kepler-20 d_stars_processed.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: (results) => {
      stars = results.data.filter(s => s.x && s.y && s.z);
      
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
        const color = getStarColor(star.colour, star.temperature);
        const radius = Math.max(1, Math.min(20, (star.stellar_radius || 1) * STAR_SIZE_SCALE));

        const geom = new THREE.SphereGeometry(radius, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9
        });
        const mesh = new THREE.Mesh(geom, mat);

        // Add glow effect
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

        mesh.userData = {
          source_id: star.source_id,
          temperature: star.temperature,
          stellar_radius: star.stellar_radius,
          colour: star.colour
        };

        scene.add(mesh);
        starMeshes.push(mesh);
      });
      
      console.log(Loaded ${starMeshes.length} stars);
      console.log(Data bounds: X(${minX.toFixed(2)}, ${maxX.toFixed(2)}), Y(${minY.toFixed(2)}, ${maxY.toFixed(2)}), Z(${minZ.toFixed(2)}, ${maxZ.toFixed(2)}));
    }
  });
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes);
  
  if (intersects.length > 0) {
    const data = intersects[0].object.userData;
    tooltip.style.display = "block";
    tooltip.style.left = event.clientX + 15 + "px";
    tooltip.style.top = event.clientY - 10 + "px";
    tooltip.innerHTML = `
      <strong>Gaia ID:</strong> ${data.source_id}<br>
      <strong>Temperature:</strong> ${data.temperature || "Unknown"} K<br>
      <strong>Stellar Radius:</strong> ${data.stellar_radius || "Unknown"}<br>
      <strong>Color Index:</strong> ${data.colour || "Unknown"}
    `;
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
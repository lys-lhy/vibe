/**
 * Climate Earth Explorer - Enhanced Vegetation Visualization
 * Features: 3D plant models, continent regions, hover tooltips
 */

// =============================================================================
// 🌍 Global State
// =============================================================================
const state = {
    dataset: 'temp',
    year: 2025,
    quizActive: false,
    currentQ: null,
    sessionStarted: false,
    vegetation: {
        enabled: false,
        plants: {},
        continents: {},
        markers: [],
        selectedPlant: null,
        continentFilter: null
    }
};

// =============================================================================
// 📦 DOM Elements
// =============================================================================
const el = {
    canvas: document.getElementById('canvas-container'),
    datasetSelect: document.getElementById('dataset-select'),
    timeSlider: document.getElementById('time-slider'),
    yearDisplay: document.getElementById('year-display'),
    datasetLabel: document.getElementById('dataset-label'),
    vegControls: document.getElementById('vegetation-controls'),
    plantSelect: document.getElementById('plant-select'),
    continentFilter: document.getElementById('continent-filter'),
    toggleLayerBtn: document.getElementById('toggle-plant-layer'),
    vegLegend: document.getElementById('vegetation-legend'),
    continentLegend: document.getElementById('continent-legend-items'),
    quizContent: document.getElementById('quiz-content'),
    feedbackArea: document.getElementById('feedback-area'),
    feedbackMsg: document.getElementById('feedback-msg'),
    startQuizBtn: document.getElementById('start-quiz-btn'),
    nextQBtn: document.getElementById('next-q-btn'),
    quizProgress: document.getElementById('quiz-progress'),
    tooltip: document.getElementById('plant-tooltip'),
    tooltipName: document.getElementById('tooltip-plant-name'),
    tooltipContinent: document.getElementById('tooltip-continent-badge'),
    tooltipScientific: document.getElementById('tooltip-scientific'),
    tooltipFamily: document.getElementById('tooltip-family'),
    tooltipType: document.getElementById('tooltip-type'),
    tooltipAbundance: document.getElementById('tooltip-abundance'),
    tooltipElevation: document.getElementById('tooltip-elevation'),
    tooltipDesc: document.getElementById('tooltip-description'),
    loading: document.getElementById('loading-indicator')
};

// =============================================================================
// 🔧 Three.js Setup
// =============================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
el.canvas.appendChild(renderer.domElement);

camera.position.z = 15;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 8;
controls.maxDistance = 30;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

// Earth
const earthGeo = new THREE.SphereGeometry(5, 64, 64);
const earthMat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 20 });
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

// Wireframe
const wireGeo = new THREE.WireframeGeometry(earthGeo);
earth.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 })));

// Stars
function createStars(n=1500) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n*3);
    for(let i=0; i<n*3; i+=3) {
        pos[i] = (Math.random()-0.5)*200;
        pos[i+1] = (Math.random()-0.5)*200;
        pos[i+2] = (Math.random()-0.5)*200;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({color:0xffffff, size:0.15, transparent:true, opacity:0.8}));
}
scene.add(createStars());

// =============================================================================
// 🌿 3D Plant Model Builder
// =============================================================================

/**
 * Create a 3D plant model from configuration
 * Supports: tree, conifer, tropical_tree, understory, shrub, eucalypt
 */
function createPlantModel(config) {
    const group = new THREE.Group();
    const model = config.model;
    const scale = model.scale || 1.0;
    
    // Create trunk
    let trunk;
    const trunkCfg = model.trunk;
    const trunkMat = new THREE.MeshPhongMaterial({ 
        color: trunkCfg.color || '#6d4c41',
        shininess: 10
    });
    
    if (trunkCfg.geometry === 'cylinder') {
        trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(trunkCfg.radius, trunkCfg.radius*0.9, trunkCfg.height, 6),
            trunkMat
        );
        trunk.rotation.x = Math.PI / 2;
    } else {
        trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.25, 6), trunkMat);
        trunk.rotation.x = Math.PI / 2;
    }
    trunk.position.y = trunkCfg.height / 2;
    group.add(trunk);
    
    // Create crown/foliage
    let crown;
    const crownCfg = model.crown;
    const crownMat = new THREE.MeshPhongMaterial({
        color: crownCfg.color || config.color,
        shininess: 15,
        transparent: true,
        opacity: 0.95
    });
    
    switch(crownCfg.geometry) {
        case 'sphere':
            crown = new THREE.Mesh(
                new THREE.SphereGeometry(crownCfg.radius, crownCfg.segments||8, crownCfg.segments||8),
                crownMat
            );
            break;
        case 'cone':
            crown = new THREE.Mesh(
                new THREE.ConeGeometry(crownCfg.radius, crownCfg.height, crownCfg.segments||8),
                crownMat
            );
            crown.position.y = trunkCfg.height + crownCfg.height/2;
            break;
        case 'dodecahedron':
            crown = new THREE.Mesh(
                new THREE.DodecahedronGeometry(crownCfg.radius, 0),
                crownMat
            );
            break;
        case 'octahedron':
            crown = new THREE.Mesh(
                new THREE.OctahedronGeometry(crownCfg.radius, 0),
                crownMat
            );
            break;
        default:
            crown = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 6, 6),
                crownMat
            );
    }
    
    // Position crown if not already positioned (cone case)
    if (crownCfg.geometry !== 'cone') {
        crown.position.y = trunkCfg.height + crownCfg.radius * 0.8;
    }
    
    group.add(crown);
    
    // Apply overall scale
    group.scale.setScalar(scale);
    
    // Add subtle animation data
    group.userData = {
        ...config,
        baseScale: scale,
        swayOffset: Math.random() * Math.PI * 2,
        type: config.type
    };
    
    return group;
}

/**
 * Convert lat/lng to 3D position on sphere
 */
function latLngToVector3(lat, lng, radius = 5.03) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

/**
 * Create interactive plant marker with 3D model
 */
function createPlantMarker(lat, lng, plantConfig, pointData) {
    const model = createPlantModel(plantConfig);
    model.position.copy(latLngToVector3(lat, lng));
    
    // Orient model to face outward from sphere
    model.lookAt(new THREE.Vector3(0, 0, 0));
    model.rotateX(Math.PI / 2);
    
    // Store interaction data
    model.userData = {
        ...model.userData,
        ...pointData,
        lat, lng,
        isPlant: true,
        continent: pointData.continent || _getContinentForCoords(lat, lng)
    };
    
    // Add hover highlight effect (subtle glow)
    const glowGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
        color: plantConfig.color,
        transparent: true,
        opacity: 0,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(model.position);
    glow.userData = { isGlow: true, parent: model };
    
    return { model, glow };
}

/**
 * Determine continent from coordinates using bounds
 */
function _getContinentForCoords(lat, lng) {
    if (!state.vegetation.continents) return null;
    for (const [code, data] of Object.entries(state.vegetation.continents)) {
        const b = data.bounds;
        if (b.lat_min <= lat && lat <= b.lat_max && b.lng_min <= lng && lng <= b.lng_max) {
            return code;
        }
    }
    return null;
}

// =============================================================================
// 🎨 Visualization Functions
// =============================================================================

function updateEarthVisuals() {
    if (state.dataset === 'vegetation') {
        // Neutral earth for vegetation mode
        const colors = [];
        const c = new THREE.Color(0x1a473a);
        for (let i = 0; i < earthGeo.attributes.position.count; i++) {
            colors.push(c.r, c.g, c.b);
        }
        earthGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        earthGeo.attributes.color.needsUpdate = true;
        return;
    }
    
    // Climate data visualization
    const positions = earthGeo.attributes.position;
    const colors = [];
    const color = new THREE.Color();
    
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        let value = 0;
        
        if (state.dataset === 'temp') {
            const t = (state.year - 1880) / (2025 - 1880);
            value = (t * 0.85) + (Math.abs(y)/5 * 0.15) - 0.5;
        } else if (state.dataset === 'co2') {
            value = (state.year - 1880) / (2025 - 1880) - 0.15;
        } else if (state.dataset === 'rain') {
            value = Math.sin(x*12)*Math.cos(z*12)*0.4 + Math.sin(y*0.5)*0.3 + ((state.year-1980)/45)*0.2 - 0.3;
        }
        
        if (value < 0) {
            color.setHSL(0.6 + (value+1)*0.15, 1.0, 0.5 + Math.abs(value)*0.2);
        } else {
            color.setHSL(0.0 + value*0.08, 1.0, 0.5 + value*0.25);
        }
        colors.push(color.r, color.g, color.b);
    }
    
    earthGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    earthGeo.attributes.color.needsUpdate = true;
}

function renderContinentLegend(continents) {
    el.continentLegend.innerHTML = '';
    Object.entries(continents).forEach(([code, data]) => {
        if (code === 'antarctica') return;  // Skip for legend
        const item = document.createElement('div');
        item.className = 'continent-legend-item';
        item.innerHTML = `
            <div class="continent-color-dot" style="background:${data.color}"></div>
            <span>${data.name}</span>
        `;
        el.continentLegend.appendChild(item);
    });
}

async function loadVegetationData() {
    showLoading(true);
    try {
        const res = await fetch('/api/vegetation/data?demo=true&continents=true');
        const data = await res.json();
        
        if (data.plants) {
            state.vegetation.plants = data.plants;
            state.vegetation.continents = data.continents || {};
            
            renderContinentLegend(state.vegetation.continents);
            populatePlantSelector(data.plants);
            renderAllPlantMarkers();
        }
    } catch (err) {
        console.error('Load vegetation failed:', err);
    } finally {
        showLoading(false);
    }
}

function populatePlantSelector(plants) {
    el.plantSelect.innerHTML = '<option value="">-- All Plants --</option>';
    Object.entries(plants).forEach(([slug, plant]) => {
        const opt = document.createElement('option');
        opt.value = slug;
        opt.textContent = plant.name;
        el.plantSelect.appendChild(opt);
    });
}

function renderAllPlantMarkers() {
    clearPlantMarkers();
    
    const filterPlant = state.vegetation.selectedPlant;
    const filterContinent = state.vegetation.continentFilter;
    
    Object.entries(state.vegetation.plants).forEach(([slug, plant]) => {
        if (filterPlant && slug !== filterPlant) return;
        
        plant.points.forEach(point => {
            if (filterContinent && point.continent !== filterContinent) return;
            
            const { model, glow } = createPlantMarker(
                point.lat, point.lng, plant, 
                { slug, ...point, plantName: plant.name }
            );
            
            scene.add(model);
            scene.add(glow);
            state.vegetation.markers.push({ model, glow });
        });
    });
}

function clearPlantMarkers() {
    state.vegetation.markers.forEach(({ model, glow }) => {
        scene.remove(model);
        scene.remove(glow);
    });
    state.vegetation.markers = [];
}

// =============================================================================
// 🖱️ Tooltip & Interaction System
// =============================================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMarker = null;
let tooltipTimeout = null;

/**
 * Update tooltip position and content
 */
function updateTooltip(event, plantData) {
    if (!plantData) {
        el.tooltip.classList.add('hidden');
        return;
    }
    
    // Position tooltip near cursor
    el.tooltip.style.left = `${event.clientX}px`;
    el.tooltip.style.top = `${event.clientY}px`;
    
    // Populate content
    el.tooltipName.textContent = plantData.plantName || plantData.name;
    el.tooltipContinent.textContent = state.vegetation.continents[plantData.continent]?.name || plantData.continent;
    el.tooltipContinent.style.background = state.vegetation.continents[plantData.continent]?.color || '#666';
    
    el.tooltipScientific.textContent = plantData.scientific_name || '-';
    el.tooltipFamily.textContent = plantData.family || '-';
    el.tooltipType.textContent = plantData.type?.replace('_', ' ').toUpperCase() || '-';
    el.tooltipAbundance.textContent = `${Math.round(plantData.abundance * 100)}%`;
    el.tooltipElevation.textContent = `${plantData.elevation || 0}m`;
    el.tooltipDesc.textContent = plantData.info || 'No additional information available.';
    
    el.tooltip.classList.remove('hidden');
}

/**
 * Handle mouse move for tooltip positioning and hover detection
 */
function handleMouseMove(event) {
    // Update tooltip position if visible
    if (!el.tooltip.classList.contains('hidden')) {
        el.tooltip.style.left = `${event.clientX + 10}px`;
        el.tooltip.style.top = `${event.clientY - 10}px`;
    }
    
    // Raycast for plant markers
    if (state.dataset !== 'vegetation') return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check intersections with plant models
    const plantModels = state.vegetation.markers.map(m => m.model);
    const intersects = raycaster.intersectObjects(plantModels, true);
    
    if (intersects.length > 0) {
        // Find the root plant group
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData?.isPlant) {
            obj = obj.parent;
        }
        
        if (obj.userData?.isPlant && obj !== hoveredMarker) {
            // New hover
            if (hoveredMarker) {
                // Reset previous glow
                const prevGlow = state.vegetation.markers.find(m => m.model === hoveredMarker)?.glow;
                if (prevGlow) prevGlow.material.opacity = 0;
            }
            
            hoveredMarker = obj;
            const glow = state.vegetation.markers.find(m => m.model === obj)?.glow;
            if (glow) {
                glow.material.opacity = 0.3;
                glow.scale.setScalar(1.5);
            }
            
            // Show tooltip with delay
            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                updateTooltip(event, obj.userData);
            }, 200);
            
            // Change cursor
            renderer.domElement.style.cursor = 'pointer';
        }
    } else if (hoveredMarker) {
        // Hover ended
        clearTimeout(tooltipTimeout);
        el.tooltip.classList.add('hidden');
        
        const glow = state.vegetation.markers.find(m => m.model === hoveredMarker)?.glow;
        if (glow) {
            glow.material.opacity = 0;
            glow.scale.setScalar(1);
        }
        hoveredMarker = null;
        renderer.domElement.style.cursor = 'grab';
    }
}

// =============================================================================
// 🧠 Quiz System (unchanged core logic)
// =============================================================================

async function startQuizRound() {
    try {
        const res = await fetch('/api/round/start', { method: 'POST' });
        await res.json();
        state.sessionStarted = true;
        state.quizActive = true;
        el.startQuizBtn.classList.add('hidden');
        el.quizProgress.textContent = '0/10';
        fetchNextQuestion();
    } catch (e) { console.error('Quiz start failed:', e); }
}

async function fetchNextQuestion() {
    try {
        const res = await fetch('/api/question/next', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ context: { dataset: state.dataset, year: state.year } })
        });
        state.currentQ = await res.json();
        renderQuestion(state.currentQ);
    } catch (e) { console.error('Fetch question failed:', e); }
}

function renderQuestion(q) {
    el.quizContent.innerHTML = `<div class="question-text">${q.prompt}</div><div id="choices"></div>`;
    const container = document.getElementById('choices');
    q.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice;
        btn.onclick = () => submitAnswer(i);
        container.appendChild(btn);
    });
}

async function submitAnswer(idx) {
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
    try {
        const res = await fetch('/api/answer/check', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ qid: state.currentQ.qid, choice_index: idx })
        });
        const data = await res.json();
        handleFeedback(data, idx);
    } catch (e) { console.error('Answer check failed:', e); }
}

function handleFeedback(data, selectedIdx) {
    const btns = document.querySelectorAll('.choice-btn');
    btns.forEach((b, i) => {
        if (data.correct && i === selectedIdx) b.classList.add('correct');
        else if (!data.correct && i === selectedIdx) b.classList.add('incorrect');
    });
    
    el.quizContent.classList.add('hidden');
    el.feedbackArea.classList.remove('hidden');
    el.feedbackMsg.innerHTML = `
        <h4 class="${data.correct ? 'correct' : 'incorrect'}">
            ${data.correct ? '✅ Correct!' : '❌ Not quite'}
        </h4>
        <p>${data.explanation}</p>
        <p><strong>Score:</strong> ${data.correct_count}/10</p>
    `;
    
    pulseEarth(data.correct);
    el.quizProgress.textContent = `${data.correct_count}/10`;
    
    if (data.done) {
        el.nextQBtn.textContent = '🎉 Complete!';
        el.nextQBtn.onclick = () => location.reload();
    } else {
        el.nextQBtn.textContent = 'Next →';
        el.nextQBtn.onclick = () => {
            el.feedbackArea.classList.add('hidden');
            el.quizContent.classList.remove('hidden');
            fetchNextQuestion();
        };
    }
}

function pulseEarth(correct) {
    const orig = earthMat.emissive.getHex();
    earthMat.emissive.setHex(correct ? 0x00ff88 : 0xff4466);
    earthMat.emissiveIntensity = 0.5;
    let i = 0.5;
    const anim = () => {
        i -= 0.05;
        earthMat.emissiveIntensity = Math.max(0, i);
        if (i > 0) requestAnimationFrame(anim);
        else earthMat.emissive.setHex(orig);
    };
    requestAnimationFrame(anim);
}

// =============================================================================
// 🎮 Event Listeners
// =============================================================================

// Dataset change
el.datasetSelect.addEventListener('change', e => {
    state.dataset = e.target.value;
    el.datasetLabel.textContent = {
        'temp': 'Temperature', 'co2': 'CO₂', 'rain': 'Rainfall', 'vegetation': 'Vegetation'
    }[state.dataset];
    
    const isVeg = state.dataset === 'vegetation';
    el.vegControls.classList.toggle('hidden', !isVeg);
    el.vegLegend.classList.toggle('hidden', !isVeg);
    document.getElementById('legend-box').classList.toggle('hidden', isVeg);
    
    updateEarthVisuals();
    if (isVeg && !Object.keys(state.vegetation.plants).length) loadVegetationData();
});

// Time slider
el.timeSlider.addEventListener('input', e => {
    state.year = parseInt(e.target.value);
    el.yearDisplay.textContent = state.year;
    updateEarthVisuals();
});

// Plant/continent filters
el.plantSelect.addEventListener('change', e => {
    state.vegetation.selectedPlant = e.target.value || null;
    renderAllPlantMarkers();
    el.tooltip.classList.add('hidden');
});

el.continentFilter.addEventListener('change', e => {
    state.vegetation.continentFilter = e.target.value || null;
    renderAllPlantMarkers();
});

el.toggleLayerBtn.addEventListener('click', () => {
    state.vegetation.enabled = !state.vegetation.enabled;
    state.vegetation.markers.forEach(({ model, glow }) => {
        model.visible = state.vegetation.enabled;
        glow.visible = state.vegetation.enabled;
    });
    el.toggleLayerBtn.textContent = state.vegetation.enabled ? '🙈 Hide' : '👁️ Show';
});

// Mouse interaction for tooltip
renderer.domElement.addEventListener('mousemove', handleMouseMove);
renderer.domElement.addEventListener('mouseleave', () => {
    el.tooltip.classList.add('hidden');
    if (hoveredMarker) {
        const glow = state.vegetation.markers.find(m => m.model === hoveredMarker)?.glow;
        if (glow) { glow.material.opacity = 0; glow.scale.setScalar(1); }
        hoveredMarker = null;
    }
});

// Quiz buttons
el.startQuizBtn.addEventListener('click', startQuizRound);

// Loading helper
function showLoading(show) {
    el.loading.classList.toggle('hidden', !show);
}

// =============================================================================
// 🔄 Animation Loop
// =============================================================================

function animate() {
    requestAnimationFrame(animate);
    
    // Earth rotation
    earth.rotation.y += 0.0008;
    controls.update();
    
    // Animate plant models (gentle sway)
    const t = Date.now() * 0.001;
    state.vegetation.markers.forEach(({ model }) => {
        if (!model.userData?.isPlant || !model.visible) return;
        
        // Subtle swaying motion
        const sway = Math.sin(t * 1.5 + model.userData.swayOffset) * 0.02;
        model.rotation.z = sway;
        
        // Gentle scale pulse based on abundance
        const base = model.userData.baseScale;
        const abundance = model.userData.abundance || 0.5;
        const pulse = 1 + Math.sin(t * 2 + model.userData.swayOffset) * 0.03 * abundance;
        model.scale.setScalar(base * pulse);
    });
    
    renderer.render(scene, camera);
}

// =============================================================================
// 🚀 Initialization
// =============================================================================

// Init
updateEarthVisuals();
animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Welcome message
console.log(`
🌿 Enhanced Vegetation Mode Loaded!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Hover over plant markers for details
• Filter by plant species or continent
• Different 3D models for each plant type
• Continent color coding in legend

Datasets: 🌡️ Temp • 🏭 CO₂ • 🌧️ Rain • 🌿 Vegetation
`);
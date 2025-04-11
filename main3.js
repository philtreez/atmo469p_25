import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

// Globale Variablen
let scene, camera, renderer, mixer, composer, controls, model;
const clock = new THREE.Clock();

const sixObjects = {};          // Dictionary für die 9 Objekte aus ixers2.glb
const eightObjects = {};        // Dictionary für die 8 Objekte aus dem neuen GLB
const numWavePoints = 128;      // Anzahl der Punkte pro Linie
let audioAnalyser = null;       // RNBO-Audio-Analyser
let waveformGroup;              // Gruppe für die Waveform-Konturen
let cameraPivot;                // Gruppe als Pivot für die Kamera
let animActions = [];
let otherModel, otherMixer;
let directionalLight;
let afterimagePass;             // Wir deklarieren diesen hier global, damit handleAfterimageDamp darauf zugreifen kann.
let globalAfterimageDamp = 0.68;

init();
animate();
setup();

function init() {
  // Szene erstellen
  scene = new THREE.Scene();

  // Kamera erstellen und positionieren
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(8, 10, -22);

  // Erstelle einen Pivot und füge die Kamera hinzu
  cameraPivot = new THREE.Group();
  cameraPivot.position.copy(camera.position); // Basisposition speichern
  cameraPivot.rotation.y = Math.PI / 1.5 ; // 22.5° Drehung um die X-Achse

  cameraPivot.add(camera);
  scene.add(cameraPivot);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.autoRotate = false;
  controls.update();

  // Licht
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffd429, 0);
  directionalLight.position.set(5, 10, -25);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const loader = new GLTFLoader();

  // Lade das animierte Modell (pi25.glb)
  loader.load(
    'pi30.glb',
    (gltf) => {
      model = gltf.scene;
      model.scale.set(4.5, 4.5, 4.5);
      model.position.set(0, -1, 0);
      model.rotation.set(0, Math.PI, 0);
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      scene.add(model);
      
      mixer = new THREE.AnimationMixer(model);
      const clips = gltf.animations;
      if (clips.length > 0) {
        clips.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.loop = THREE.LoopOnce;
          action.clampWhenFinished = true;
          action.play();
          action.paused = true; // Animation pausieren, sodass alle bei Frame 1 starten
          action.setTime(0);
          animActions.push(action);
        });
      }
    },
    undefined,
    (error) => { console.error('Fehler beim Laden von pi25.glb:', error); }
  );  

  // Lade die 9 Objekte (ixers2.glb)
  loader.load(
    'sxx.glb',
    (gltf) => {
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0xde002c,
        emissive: 0xffdf4f,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0,
        metalness: 0.5,
        roughness: 0.5,
        wireframe: true
      
      });
      
      gltf.scene.traverse((node) => {
        if (node.isMesh && /^[1-9]$/.test(node.name)) {
          node.material = baseMaterial.clone();
          node.material.transparent = true;
          sixObjects[node.name] = node;
        }
      });
      gltf.scene.position.set(0, 0, 0); 
      gltf.scene.scale.set(5, 5, 5);
      scene.add(gltf.scene);
    },
    undefined,
    (error) => { console.error('Fehler beim Laden von ixers2.glb:', error); }
  );

  // Lade das zusätzliche Modell (benz3.glb)
  loader.load(
    'benz3.glb',
    (gltf) => {
      otherModel = gltf.scene;
      otherModel.position.set(0, 0, 0);
      otherModel.scale.set(8, 8, 8);
  
      otherModel.traverse((child) => {
        if (child.name === "light" && child.isMesh) {
          child.material = child.material.clone();
          child.material.color.set(0xfffd429);
          child.material.emissive.set(0xfff9e0);
          child.material.emissiveIntensity = 6.0;
        }
      });
  
      scene.add(otherModel);
  
      otherMixer = new THREE.AnimationMixer(otherModel);
      const clips = gltf.animations;
      if (clips.length > 0) {
        const action = otherMixer.clipAction(clips[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
      }
    },
    undefined,
    (error) => { console.error('Fehler beim Laden von benz3.glb:', error); }
  );

  // << Neuer Abschnitt: Lade das neue GLB mit 8 Objekten >>
// Globales Dictionary für die 8 Objekte
loader.load(
  'guiti.glb', // Pfad zum neuen GLB
  (gltf) => {
    const newModel = gltf.scene;
    newModel.position.set(0, 0, 0);
    newModel.scale.set(0.7, 0.7, 0.7);
    newModel.wireframe = true; // Wireframe-Mode aktivieren
    newModel.traverse((node) => {
      if (node.isMesh && /^[1-8]$/.test(node.name)) {
        node.visible = false; // initial unsichtbar
        console.log(`Mesh ${node.name} wird eingefügt und initial versteckt.`);
        eightObjects[node.name] = node;
      }
    });
    scene.add(newModel);
  },
  undefined,
  (error) => { console.error('Fehler beim Laden des neuen GLB:', error); }
);


  
  // << Ende neuer Abschnitt >>

  // Erzeuge mehrere konzentrische Quadrate (Konturen) als Waveform
  createNestedSquareWaveforms(5, 1.0);

  // Postprocessing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  afterimagePass = new AfterimagePass();
  afterimagePass.uniforms['damp'].value = 0.88;
  composer.addPass(afterimagePass);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.9, 0.2, 0.05);
  composer.addPass(bloomPass);

  window.addEventListener('resize', onWindowResize);
}

function createThickLine(edge) {
  const positions = [];
  for (let i = 0; i < numWavePoints; i++) {
    const t = i / (numWavePoints - 1);
    const baseX = edge.start.x + (edge.end.x - edge.start.x) * t;
    const baseY = 0;
    const baseZ = edge.start.z + (edge.end.z - edge.start.z) * t;
    positions.push(baseX, baseY, baseZ);
  }
  
  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  
  const material = new LineMaterial({
    color: 0xbf0033,
    linewidth: 3,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
  });
  
  const line = new Line2(geometry, material);
  line.userData.edge = edge;
  return line;
}

/**
 * Erzeugt mehrere konzentrische Quadrate als Waveform.
 */
function createNestedSquareWaveforms(numContours = 5, step = 1.0) {
  waveformGroup = new THREE.Group();
  
  for (let i = 0; i < numContours; i++) {
    const scale = 2 + i * step;
    const scaledEdges = [
      {
        start: new THREE.Vector3(-4 * scale, 0, 4 * scale),
        end: new THREE.Vector3(4 * scale, 0, 4 * scale),
        normal: new THREE.Vector3(0, 1, 0)
      },
      {
        start: new THREE.Vector3(4 * scale, 0, 4 * scale),
        end: new THREE.Vector3(4 * scale, 0, -4 * scale),
        normal: new THREE.Vector3(0, 1, 0)
      },
      {
        start: new THREE.Vector3(4 * scale, 0, -4 * scale),
        end: new THREE.Vector3(-4 * scale, 0, -4 * scale),
        normal: new THREE.Vector3(0, 1, 0)
      },
      {
        start: new THREE.Vector3(-4 * scale, 0, -4 * scale),
        end: new THREE.Vector3(-4 * scale, 0, 4 * scale),
        normal: new THREE.Vector3(0, 1, 0)
      }
    ];
    
    scaledEdges.forEach((edge) => {
      const thickLine = createThickLine(edge);
      waveformGroup.add(thickLine);
    });
  }
  
  scene.add(waveformGroup);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  
  if (waveformGroup) {
    waveformGroup.children.forEach((line) => {
      if (line.material && line.material.resolution) {
        line.material.resolution.set(window.innerWidth, window.innerHeight);
      }
    });
  }
}

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (otherMixer) otherMixer.update(delta);
  
  if (model) model.rotation.y += 0.005;
  
  controls.update();
  
  // Aktualisiere die Waveform-Linien, falls vorhanden
  if (audioAnalyser && waveformGroup) {
    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    audioAnalyser.getByteTimeDomainData(dataArray);
    
    waveformGroup.children.forEach((line) => {
      const { start, end, normal } = line.userData.edge;
      const updatedPositions = [];
      for (let i = 0; i < numWavePoints; i++) {
        const tPoint = i / (numWavePoints - 1);
        const baseX = start.x + (end.x - start.x) * tPoint;
        const baseY = 0;
        const baseZ = start.z + (end.z - start.z) * tPoint;
        let offset = (dataArray[i] - 128) / 128;
        offset *= 7.0;
        updatedPositions.push(baseX, baseY + normal.y * offset, baseZ);
      }
      line.geometry.setPositions(updatedPositions);
    });
  }

  // Kamera-Pivot Oszillation
  const t = clock.getElapsedTime();
  const amplitude = 5.5;
  cameraPivot.position.set(
    amplitude * Math.sin(t * 0.8),
    18 + amplitude * Math.cos(t * 0.7),
    -18 + amplitude * Math.sin(t * 0.9)
  );
  
  composer.render();
}

// Steuerung des Directional Lights
function handleDirectionalLight(value) {
  directionalLight.intensity = value;
}

// Steuerung der Sichtbarkeit der 9 Objekte (aus ixers2.glb)
function handleSixOutput(value) {
  if (value === 0) return;
  const key = value.toString();
  for (const k in sixObjects) {
    sixObjects[k].material.opacity = (k === key) ? 1 : 0;
  }
}

function handleLighty2(value) {
  console.log("handleLighty2 wird aufgerufen mit Wert:", value);
  
  // Falls der Wert nicht zwischen 1 und 8 liegt (also auch 0), alle Objekte verstecken.
  if (value < 1 || value > 8) {
    for (const k in eightObjects) {
      eightObjects[k].visible = false;
      console.log(`Mesh ${k} wird versteckt.`);
    }
    return;
  }
  
  // Bei einem gültigen Wert wird nur das entsprechende Objekt sichtbar gemacht.
  const key = value.toString();
  for (const k in eightObjects) {
    eightObjects[k].visible = (k === key);
    console.log(`Mesh ${k} wird ${k === key ? "sichtbar" : "versteckt"}.`);
  }
}





// Animationsstart
function handleAnim1(value) {
  animActions.forEach((action) => {
    action.paused = false;
  });
}

function handleAfterimageDamp(value) {
  globalAfterimageDamp = value;
  afterimagePass.uniforms['damp'].value = globalAfterimageDamp;
}

async function setup() {
  const patchExportURL = "six/patch.export.json";
  const WAContext = window.AudioContext || window.webkitAudioContext;
  const context = new WAContext();
  const outputNode = context.createGain();
  outputNode.connect(context.destination);
  let response, patcher;
  try {
    response = await fetch(patchExportURL);
    patcher = await response.json();
    if (!window.RNBO) await loadRNBOScript(patcher.desc.meta.rnboversion);
  } catch (err) {
    console.error('Fehler beim Laden des Patchers:', err);
    return;
  }
  let dependencies = [];
  try {
    const dependenciesResponse = await fetch("six/dependencies.json");
    dependencies = await dependenciesResponse.json();
    dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "six/" + d.file }) : d);
  } catch (e) {}
  let device;
  try {
    device = await RNBO.createDevice({ context, patcher });
  } catch (err) {
    console.error('Fehler beim Erstellen des RNBO Device:', err);
    return;
  }
  device.node.disconnect();
  const numChannels = 4;
  const splitter = context.createChannelSplitter(numChannels);
  device.node.connect(splitter);
  splitter.connect(outputNode, 0);
  splitter.connect(outputNode, 1);
  audioAnalyser = context.createAnalyser();
  audioAnalyser.fftSize = 256;
  splitter.connect(audioAnalyser, 2);
  if (dependencies.length) await device.loadDataBufferDependencies(dependencies);
  
  // Abonniere RNBO-Nachrichten für "six", "anim1", "lighty" und neu "lighty2"
  device.messageEvent.subscribe((ev) => {
    if (ev.tag === "six") {
      console.log(`RNBO Outport "six": ${ev.payload}`);
      handleSixOutput(ev.payload);
    }
    if (ev.tag === "anim1") {
      console.log(`RNBO Outport "anim1": ${ev.payload}`);
      handleAnim1(ev.payload);
    }
    if (ev.tag === "lighty") {
      console.log(`RNBO Outport "lighty": ${ev.payload}`);
      handleDirectionalLight(ev.payload);
    }
    if (ev.tag === "afterimageDamp") {
      console.log(`RNBO Outport "afterimageDamp": ${ev.payload}`);
      handleAfterimageDamp(ev.payload);
    }
    if (ev.tag === "lighty2") {
      console.log(`RNBO Outport "lighty2": ${ev.payload}`);
      handleLighty2(ev.payload);
    }
  });
  
  document.body.onclick = () => { context.resume(); };
}

function loadRNBOScript(version) {
  return new Promise((resolve, reject) => {
    if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
      throw new Error("Patcher exported with a Debug Version! Please specify the correct RNBO version.");
    }
    const el = document.createElement("script");
    el.src = "https://c74-public.nyc3.digitaloceanspaces.com/rnbo/" + encodeURIComponent(version) + "/rnbo.min.js";
    el.onload = resolve;
    el.onerror = function(err) {
      console.error(err);
      reject(new Error("Failed to load rnbo.js v" + version));
    };
    document.body.append(el);
  });
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


let analyser = null; // wird später im RNBO-Setup initialisiert
const clock = new THREE.Clock();

// Szene, Kamera und Renderer initialisieren
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Post-Processing-Effekte
const composer = new EffectComposer(renderer);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9, // Stärke
  0.4, // Abstand
  0.05 // Schwellenwert
);
bloomPass.renderToScreen = true;
composer.addPass(bloomPass);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
// Fenstergröße anpassen

// Licht hinzufügen und leicht animieren
const light = new THREE.PointLight(0xffffff, 100);
light.position.set(5, 8, 5);
scene.add(light);

// Erstelle eine Kugel-Geometrie als Basis für die organische Form
const sphereGeometry = new THREE.SphereGeometry(2, 128, 128);
const material = new THREE.MeshStandardMaterial({
  color: 0x00ff8c,
    emissive: 0x00ff00,
    emissiveIntensity: 0.05,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,

    wireframe: true,
    flatShading: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,

  roughness: 0.4,
  metalness: 0.5
});
const organicMesh = new THREE.Mesh(sphereGeometry, material);
scene.add(organicMesh);

// Speichere die ursprünglichen Vertex-Positionen
const basePositions = new Float32Array(sphereGeometry.attributes.position.array.length);
basePositions.set(sphereGeometry.attributes.position.array);
// Array zum Speichern der beweglichen Objekte
const movingObjects = [];

// GLTF‑Loader zum Laden der .glb-Datei
const loader = new GLTFLoader();
loader.load('atmo.glb', (gltf) => {
  const model = gltf.scene;
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0x00ff8c,
        emissive: 0x00ff00,
        emissiveIntensity: 0.05,
        wireframe: true,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.1,
        metalness: 0.9  
      }); // Verwende das gleiche Material wie die organische Form
    }
  });

  scene.add(model);

  // Durchlaufe alle Kinder des Modells – in diesem Fall die 8 Objekte
  model.children.forEach((child) => {
    // Optional: Leichte Verschiebung der Startposition
    child.position.x += (Math.random() - 0.5) * 1.2;
    child.position.y += (Math.random() - 0.5) * 1.0;
    child.position.z += (Math.random() - 0.5) * 0.9;

    // Zufällige Geschwindigkeiten für die Position (Bewegungsrichtung)
    child.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    );

    // Zufällige Rotationsgeschwindigkeiten
    child.userData.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.02
    );

    movingObjects.push(child);
  });
});

function animate() {
  const time = clock.getElapsedTime();

  let audioAmplitude = 0;
  if (analyser) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    audioAmplitude = (sum / dataArray.length) / 256; // Normiert zwischen 0 und 1
  }

  // Lichtposition animieren (Kreisbewegung mit leichter vertikaler Schwankung)
  const radius = 5;
  light.position.x = radius * Math.cos(time * 0.2);
  light.position.z = radius * Math.sin(time * 0.15);
  light.position.y = 2 + Math.sin(time * 0.8);

  // Komplexe Deformation der Geometrie:
  // Hier kombinieren wir mehrere Noise-Funktionen, um einen abwechslungsreicheren Effekt zu erzielen.
  const positions = sphereGeometry.attributes.position.array;
  const count = sphereGeometry.attributes.position.count;
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const ox = basePositions[ix];
    const oy = basePositions[ix + 1];
    const oz = basePositions[ix + 2];

    const vertex = new THREE.Vector3(ox, oy, oz);
    const baseRadius = vertex.length();

    // Mehrere Noise-Funktionen kombinieren:
    const noise1 = Math.sin(time + ox * 1.5 + oy * 1.2 + oz * 1.8);
    const noise2 = Math.cos(time * 0.5 + ox * 2.0 + oy * 2.2 + oz * 2.5);
    const noise3 = Math.sin(time * 1.5 + ox * 0.5 + oy * 1.5 + oz * 2.0);
    const combinedNoise = (noise1 + noise2 + noise3) / 3;

    // Erhöhe den Einfluss des Audiopegels und kombiniere ihn mit dem Noise
    const displacement = 1 + audioAmplitude * combinedNoise * 1.5;
    const newRadius = baseRadius * displacement;
    const newPos = vertex.normalize().multiplyScalar(newRadius);

    positions[ix]     = newPos.x;
    positions[ix + 1] = newPos.y;
    positions[ix + 2] = newPos.z;
  }
  sphereGeometry.attributes.position.needsUpdate = true;

  movingObjects.forEach((obj) => {
    // Position aktualisieren
    obj.position.add(obj.userData.velocity);

    // Rotation aktualisieren
    obj.rotation.x += obj.userData.rotationSpeed.x;
    obj.rotation.y += obj.userData.rotationSpeed.y;
    obj.rotation.z += obj.userData.rotationSpeed.z;

    // Optional: Begrenze die Bewegung auf einen Bereich (z. B. zwischen -5 und 5)
    ['x', 'y', 'z'].forEach(axis => {
      if (obj.position[axis] > 5 || obj.position[axis] < -5) {
        obj.userData.velocity[axis] = -obj.userData.velocity[axis];
      }
    });
  });
composer.render();
}

// RNBO-Setup: Lädt den Patch und erstellt einen Audio-Analyser, der die Geometrie beeinflusst.
async function setup() {
  const patchExportURL = "patch.export.json";

  // Erstelle AudioContext
  const WAContext = window.AudioContext || window.webkitAudioContext;
  const context = new WAContext();

  // Erstelle den Ausgangsknoten und verbinde ihn mit dem Audio-Ausgang
  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  // Patch laden
  let response, patcher;
  try {
    response = await fetch(patchExportURL);
    patcher = await response.json();

    if (!window.RNBO) {
      await loadRNBOScript(patcher.desc.meta.rnboversion);
    }
  } catch (err) {
    console.error("Fehler beim Laden des Patchers:", err);
    return;
  }

  // Gerät erstellen
  let device;
  try {
    device = await RNBO.createDevice({ context, patcher });
  } catch (err) {
    console.error("Fehler beim Erstellen des RNBO-Geräts:", err);
    return;
  }

  // Um den Audio-Effekt einzubinden, schalten wir den direkten Anschluss ab und erstellen einen Analyser.
  device.node.disconnect();
  analyser = context.createAnalyser();
  analyser.fftSize = 256; // Je kleiner, desto gröber die Auflösung
  // Verkette: Gerät → Analyser → Ausgang
  device.node.connect(analyser);
  analyser.connect(outputNode);

  // Startet den AudioContext bei einem Klick
  document.body.onclick = () => {
    context.resume();
  };
}

function loadRNBOScript(version) {
  return new Promise((resolve, reject) => {
    if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
      throw new Error("Patcher wurde mit einer Debug-Version exportiert! Bitte die korrekte RNBO-Version angeben.");
    }
    const el = document.createElement("script");
    el.src = "https://c74-public.nyc3.digitaloceanspaces.com/rnbo/" + encodeURIComponent(version) + "/rnbo.min.js";
    el.onload = resolve;
    el.onerror = function (err) {
      console.error("Fehler beim Laden von rnbo.js:", err);
      reject(new Error("Laden von rnbo.js v" + version + " fehlgeschlagen."));
    };
    document.body.appendChild(el);
  });
}

setup();

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let analyser = null; // wird später im RNBO‑Setup initialisiert
const clock = new THREE.Clock();

// Szene, Kamera und Renderer initialisieren
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Post-Processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  3.9,
  0.4,
  0.3
);
bloomPass.renderToScreen = true;
composer.addPass(bloomPass);

// Licht hinzufügen
const light = new THREE.PointLight(0xffffff, 50);
light.position.set(5, 8, 5);
scene.add(light);

// Vertex-Shader – berechnet Normale und Weltposition für specular Highlights
const vertexShader = `
  uniform float time;
  uniform float audioAmplitude;
  uniform float deformMultiplier;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    
    vec3 pos = position;
    
    float n1 = sin(time * 1.0 + pos.x * 10.0) * cos(time * 1.0 + pos.y * 15.0);
    float n2 = sin(time * 1.5 + pos.z * 8.0) * cos(time * 1.25 + pos.x * 12.0);
    float n3 = sin(time * 0.5 + pos.y * 5.0) * cos(time * 2.0 + pos.z * 11.0);
    float combinedNoise = (n1 + n2 + n3) / 3.0;
    
    vec3 noiseVec;
    noiseVec.x = sin(time * 1.0 + pos.y * 7.0) * cos(time * 1.0 + pos.z * 7.0);
    noiseVec.y = sin(time * 1.2 + pos.z * 6.0) * cos(time * 1.2 + pos.x * 6.0);
    noiseVec.z = sin(time * 1.4 + pos.x * 8.0) * cos(time * 1.4 + pos.y * 8.0);
    
    vec3 offset = normal * combinedNoise * audioAmplitude * 0.3 * deformMultiplier +
                  noiseVec * audioAmplitude * 0.15 * deformMultiplier;
    
    pos += offset;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment-Shader – berechnet Basisfarbe und specular Highlight (ohne eigene Deklaration von cameraPosition)
const fragmentShader = `
  uniform float time;
  uniform float audioAmplitude;
  uniform float colorOffset;
  uniform vec3 lightDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  // HSL-zu-RGB Umrechnung
  vec3 hsl2rgb(in vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }
  
  void main() {
      float slowTime = time * 0.0042;
      float baseHue = 0.1 + slowTime;
      float individualHueOffset = colorOffset * 0.4;
      float dynamicMod = 0.04 * sin(time + vUv.x * 3.0);
      float finalHue = baseHue + individualHueOffset + dynamicMod;
      float baseSat = 0.7;
      float baseLight = 0.4;
      float satMod = 0.1 * audioAmplitude;
      float lightMod = 0.05 * sin(time + vUv.y * 3.0);
      float finalSat = clamp(baseSat + satMod, 0.0, 1.0);
      float finalLight = clamp(baseLight + lightMod, 0.0, 1.0);
      
      vec3 baseColor = hsl2rgb(vec3(finalHue, finalSat, finalLight));
      
      // Specular Highlight-Berechnung: cameraPosition ist automatisch vorhanden
      vec3 N = normalize(vNormal);
      vec3 L = normalize(lightDirection);
      vec3 V = normalize(cameraPosition - vWorldPosition);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 64.0);
      vec3 specular = vec3(1.0) * spec;
      
      // Mische die Basisfarbe und das specular Highlight zu einem metallischen Look
      vec3 finalColor = mix(baseColor, specular, 0.5);
      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Array für die geladenen GLB‑Objekte
const movingObjects = [];
// Array für AnimationMixer (falls Animationen im GLB vorhanden sind)
const mixers = [];

// GLTF-Loader zum Laden des .glb-Modells
const loader = new GLTFLoader();
loader.load('69p.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);
  
  // Animationen abspielen, falls vorhanden
  if (gltf.animations && gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
    mixers.push(mixer);
  }
  
  // Für jedes Mesh im Modell: Material ersetzen und Effekte setzen
  model.traverse((child) => {
    if (child.isMesh) {
      // Falls Skinning genutzt wird, setze explizit den Wert
      const useSkinning = child.skinning ? true : false;
      
      // (Optional) Ursprüngliche Vertex-Daten speichern
      if (child.geometry && child.geometry.isBufferGeometry) {
        const basePos = new Float32Array(child.geometry.attributes.position.array.length);
        basePos.set(child.geometry.attributes.position.array);
        child.userData.basePositions = basePos;
      }
      
      // Individuelle Parameter
      const deformMultiplier = 0.5 + Math.random() * 0.5;
      const colorOffset = Math.random();
      
      child.material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          audioAmplitude: { value: 0 },
          deformMultiplier: { value: deformMultiplier },
          colorOffset: { value: colorOffset },
          lightDirection: { value: new THREE.Vector3(5, 8, 5).normalize() }
          // cameraPosition wird automatisch von Three.js gesetzt
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        wireframe: true,
        skinning: useSkinning
      });
      
      // Minimale globale Verschiebungen
      child.position.x += (Math.random() - 0.5) * 0.2;
      child.position.y += (Math.random() - 0.5) * 0.2;
      child.position.z += (Math.random() - 0.5) * 0.2;
      child.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.001,
        (Math.random() - 0.5) * 0.001,
        (Math.random() - 0.5) * 0.001
      );
      child.userData.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.001,
        (Math.random() - 0.5) * 0.001,
        (Math.random() - 0.5) * 0.001
      );
      
      movingObjects.push(child);
    }
  });
});

function animate() {
  const time = clock.getElapsedTime();
  const delta = clock.getDelta();
  
  mixers.forEach((mixer) => mixer.update(delta));
  
  let audioAmplitude = 0;
  if (analyser) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    audioAmplitude = (sum / dataArray.length) / 256;
  }
  
  // Lichtanimation
  const radius = 5;
  light.position.x = radius * Math.cos(time * 0.2);
  light.position.z = radius * Math.sin(time * 0.15);
  light.position.y = 2 + Math.sin(time * 0.8);
  
  movingObjects.forEach((obj) => {
    obj.position.add(obj.userData.velocity);
    obj.rotation.x += obj.userData.rotationSpeed.x;
    obj.rotation.y += obj.userData.rotationSpeed.y;
    obj.rotation.z += obj.userData.rotationSpeed.z;
    
    obj.material.uniforms.time.value = time;
    obj.material.uniforms.audioAmplitude.value = audioAmplitude;
  });
  
  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  composer.setSize(window.innerWidth, window.innerHeight);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    renderer.setAnimationLoop(null);
  } else {
    renderer.setAnimationLoop(animate);
  }
});

// RNBO-Setup: Lädt den Patch und erstellt einen Audio-Analyser
async function setup() {
  const patchExportURL = "patch.export.json";
  const WAContext = window.AudioContext || window.webkitAudioContext;
  const context = new WAContext();
  const outputNode = context.createGain();
  outputNode.connect(context.destination);
  
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
  
  let device;
  try {
    device = await RNBO.createDevice({ context, patcher });
  } catch (err) {
    console.error("Fehler beim Erstellen des RNBO-Geräts:", err);
    return;
  }
  
  device.node.disconnect();
  analyser = context.createAnalyser();
  analyser.fftSize = 256;
  device.node.connect(analyser);
  analyser.connect(outputNode);
  
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

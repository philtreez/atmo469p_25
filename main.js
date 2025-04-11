import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';


let analyserVisual1 = null; // für out~3
let analyserVisual2 = null; // für out~4
const clock = new THREE.Clock();

// Szene, Kamera und Renderer initialisieren
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Post-Processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const afterimagePass = new AfterimagePass();
afterimagePass.uniforms["damp"].value = 0.68;
composer.addPass(afterimagePass);

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

// Vertex-Shader – berechnet Normale & Weltposition
const vertexShader = `
uniform float time;
uniform float audioAmplitude;
uniform float audioAmplitude2; // neuer Uniform für die zusätzliche Audio-Spur
uniform float deformMultiplier;
uniform float edgyMultiplier;  // neuer Uniform für die Stärke der eckigen Deformation
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  
  vec3 pos = position;
  
  // Weiche Deformation (wie bisher)
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
  
  // Neue, eckigere Deformation:
  vec3 edgeOffset = vec3(
    sign(sin(pos.x * 30.0 + time * 2.0)),
    sign(sin(pos.y * 30.0 + time * 2.0)),
    sign(sin(pos.z * 30.0 + time * 2.0))
  ) * audioAmplitude2 * edgyMultiplier * 0.5;
  
  pos += offset + edgeOffset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// Fragment-Shader – berechnet Basisfarbe & specular Highlight
const fragmentShader = `
  uniform float time;
  uniform float audioAmplitude;
  uniform float audioAmplitude2;
  uniform float colorOffset;
  uniform vec3 lightDirection;
  uniform vec3 uCameraPosition;
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
      
      // Specular Highlight-Berechnung
      vec3 N = normalize(vNormal);
      vec3 L = normalize(lightDirection);
      vec3 V = normalize(uCameraPosition - vWorldPosition);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 64.0);
      // Moduliere specular mit audioAmplitude2 für zusätzlichen Effekt
      vec3 specular = vec3(1.0) * spec * (1.0 + audioAmplitude2);
      
      // Mische Basisfarbe & specular Highlight
      vec3 finalColor = mix(baseColor, specular, 0.5);
      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Arrays für geladene Objekte und Animationen
const movingObjects = [];
const mixers = [];

// GLTF-Loader: Lade das GLB-Modell
const loader = new GLTFLoader();
loader.load('tmo.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);
  
  if (gltf.animations && gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
    mixers.push(mixer);
  }
  
  model.traverse((child) => {
    if (child.isMesh) {
      const useSkinning = child.skinning ? true : false;
      
      if (child.geometry && child.geometry.isBufferGeometry) {
        const basePos = new Float32Array(child.geometry.attributes.position.array.length);
        basePos.set(child.geometry.attributes.position.array);
        child.userData.basePositions = basePos;
      }
      
      const deformMultiplier = 0.5 + Math.random() * 0.2;
      const colorOffset = Math.random() * 2 * Math.PI;
      
      child.material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          audioAmplitude: { value: 0 },
          audioAmplitude2: { value: 0 }, // neuer Uniform
          deformMultiplier: { value: deformMultiplier },
          edgyMultiplier: { value: 0.3 }, // Beispielwert – hier kannst du den gewünschten Grad an "Eckigkeit" einstellen
          colorOffset: { value: colorOffset },
          lightDirection: { value: new THREE.Vector3(5, 8, 5).normalize() },
          uCameraPosition: { value: camera.position }
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        wireframe: false
      });
      
      
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
  
  let audioAmp1 = 0;
  if (analyserVisual1) {
    const dataArray1 = new Uint8Array(analyserVisual1.frequencyBinCount);
    analyserVisual1.getByteFrequencyData(dataArray1);
    const sum1 = dataArray1.reduce((a, b) => a + b, 0);
    audioAmp1 = (sum1 / dataArray1.length) / 256;
  }
  
  let audioAmp2 = 0;
  if (analyserVisual2) {
    const dataArray2 = new Uint8Array(analyserVisual2.frequencyBinCount);
    analyserVisual2.getByteFrequencyData(dataArray2);
    const sum2 = dataArray2.reduce((a, b) => a + b, 0);
    audioAmp2 = (sum2 / dataArray2.length) / 256;
  }
  
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
    obj.material.uniforms.audioAmplitude.value = audioAmp1;
    obj.material.uniforms.audioAmplitude2.value = audioAmp2;
    obj.material.uniforms.uCameraPosition.value.copy(camera.position);
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

// RNBO-Setup: Lade den Patch und erstelle die Audio-Analyser
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
  const splitter = context.createChannelSplitter(4);
  device.node.connect(splitter);
  // Kanäle 0 und 1 gehen an den Audioausgang
  splitter.connect(outputNode, 0);
  splitter.connect(outputNode, 1);
  // Kanäle 2 und 3 für Visuals:
  analyserVisual1 = context.createAnalyser();
  analyserVisual2 = context.createAnalyser();
  analyserVisual1.fftSize = 256;
  analyserVisual2.fftSize = 256;
  splitter.connect(analyserVisual1, 2);
  splitter.connect(analyserVisual2, 3);
  
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

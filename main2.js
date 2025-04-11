import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, mixer, composer, controls;
let morphMeshes = []; // Speichert alle Meshes mit Morph Targets
const clock = new THREE.Clock();

init();
animate();

function init() {
  // Szene, Kamera und Renderer initialisieren
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 1, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // OrbitControls einrichten
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1;

  // Postprocessing mit EffectComposer und Passes
  composer = new EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const afterimagePass = new AfterimagePass();
  afterimagePass.uniforms["damp"].value = 0.68;
  composer.addPass(afterimagePass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.9, 0.05, 0.05
  );
  composer.addPass(bloomPass);

  // Lichtquellen hinzufügen
  const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // Sterne hinzufügen
  addStars();

  // GLTF-Modell laden
  const loader = new GLTFLoader();
  loader.load(
    'satellit.glb',
    function (gltf) {
      const model = gltf.scene;
      
      // Standardmaterial für alle Objekte (z. B. grün, wireframe)
      const newMaterial = new THREE.MeshStandardMaterial({
        color: 0x5432ba,
        wireframe: true
      });
      
      // Spezielles Material für Unterobjekte, deren Name mit "laser" beginnt
      const laserMaterialPhysical = new THREE.MeshPhysicalMaterial({
        color: 0xa852ff,           // Angepasste Farbe
        emissive: 0xe7cfff,        // Emission
        emissiveIntensity: 0.5,    // Emissionsintensität
        metalness: 0.5,            // Metallizität
        roughness: 0.3,            // Rauheit
        clearcoat: 0.1,            // Klarlack-Effekt
        clearcoatRoughness: 0.25,  // Rauheit des Klarlacks
        transmission: 0.5,         // Durchsichtigkeit (Glas-Effekt)
        reflectivity: 1.0
      });

      // Alle Meshes durchlaufen und Material abhängig vom Namen zuweisen
      model.traverse((child) => {
        if (child.isMesh) {
          if (child.name && child.name.toLowerCase().startsWith("laser")) {
            child.material = laserMaterialPhysical;
          } else {
            child.material = newMaterial;
          }
          child.material.needsUpdate = true;
          
          // Falls das Mesh Morph Targets besitzt, zum Array hinzufügen
          if (child.morphTargetDictionary) {
            morphMeshes.push(child);
          }
        }
      });
      
      scene.add(model);
      
      // Animationen mit AnimationMixer abspielen
      mixer = new THREE.AnimationMixer(model);
      if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
        });
      }
    },
    undefined,
    function (error) {
      console.error('Error loading GLB:', error);
    }
  );

  window.addEventListener('resize', onWindowResize, false);
}

function addStars() {
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15
  });
  const starVertices = [];
  // Erzeuge 1000 Sterne, zufällig verteilt im Raum
  for (let i = 0; i < 1000; i++) {
    const x = THREE.MathUtils.randFloatSpread(200);
    const y = THREE.MathUtils.randFloatSpread(200);
    const z = THREE.MathUtils.randFloatSpread(200);
    starVertices.push(x, y, z);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  controls.update();
  composer.render();
}


// RNBO Setup
async function setup() {
  const patchExportURL = "patch.export.json";

  // AudioContext erstellen
  const WAContext = window.AudioContext || window.webkitAudioContext;
  const context = new WAContext();

  // Gain-Node erstellen und verbinden
  const outputNode = context.createGain();
  outputNode.connect(context.destination);
    
  // Patcher export laden
  let response, patcher;
  try {
    response = await fetch(patchExportURL);
    patcher = await response.json();
  
    if (!window.RNBO) {
      // RNBO-Script dynamisch laden
      await loadRNBOScript(patcher.desc.meta.rnboversion);
    }
  } catch (err) {
    console.error(err);
    return;
  }
    
  // (Optional) Abhängigkeiten laden
  let dependencies = [];
  try {
    const dependenciesResponse = await fetch("dependencies.json");
    dependencies = await dependenciesResponse.json();
    dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "" + d.file }) : d);
  } catch (e) {}

  // RNBO-Device erstellen
  let device;
  try {
    device = await RNBO.createDevice({ context, patcher });
  } catch (err) {
    console.error(err);
    return;
  }

  if (dependencies.length)
    await device.loadDataBufferDependencies(dependencies);

  device.node.connect(outputNode);

  // RNBO-Parameteränderungen abonnieren – Steuerung der Morph Targets
  device.parameterChangeEvent.subscribe(param => {
    // Erwartet werden Parameter wie "key1", "key2" etc.
    morphMeshes.forEach(mesh => {
      for (const [morphName, index] of Object.entries(mesh.morphTargetDictionary)) {
        let normalized = morphName.toLowerCase().replace(/\s/g, '');
        if (normalized === param.name.toLowerCase()) {
          mesh.morphTargetInfluences[index] = Math.max(0, Math.min(1, param.value));
        }
      }
    });
  });

  document.body.onclick = () => {
    context.resume();
  }
}

function loadRNBOScript(version) {
  return new Promise((resolve, reject) => {
    if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
      throw new Error("Patcher exported with a Debug Version!\nPlease specify the correct RNBO version to use in the code.");
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

setup();

import{S as x,P as z,W as P,E as S,R as C,A as D,U as L,V as H,a as B,G as E,b as N,c as V,D as O,d as v,C as U}from"./AfterimagePass-C26vPaU7.js";let l=null,c=null;const g=new U,h=new x,m=new z(75,window.innerWidth/window.innerHeight,.1,1e3);m.position.z=6;const d=new P({antialias:!0});d.setSize(window.innerWidth,window.innerHeight);d.setAnimationLoop(b);document.body.appendChild(d.domElement);const p=new S(d);p.addPass(new C(h,m));const w=new D;w.uniforms.damp.value=.68;p.addPass(w);const y=new L(new H(window.innerWidth,window.innerHeight),3.9,.4,.3);y.renderToScreen=!0;p.addPass(y);const f=new B(16777215,50);f.position.set(5,8,5);h.add(f);const W=`
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
`,k=`
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
`,M=[],A=[],R=new E;R.load("tmo.glb",t=>{const n=t.scene;if(h.add(n),t.animations&&t.animations.length>0){const e=new N(n);t.animations.forEach(i=>{e.clipAction(i).play()}),A.push(e)}n.traverse(e=>{if(e.isMesh){if(e.skinning,e.geometry&&e.geometry.isBufferGeometry){const o=new Float32Array(e.geometry.attributes.position.array.length);o.set(e.geometry.attributes.position.array),e.userData.basePositions=o}const i=.5+Math.random()*.2,a=Math.random()*2*Math.PI;e.material=new V({uniforms:{time:{value:0},audioAmplitude:{value:0},audioAmplitude2:{value:0},deformMultiplier:{value:i},edgyMultiplier:{value:.3},colorOffset:{value:a},lightDirection:{value:new v(5,8,5).normalize()},uCameraPosition:{value:m.position}},vertexShader:W,fragmentShader:k,side:O,transparent:!0,wireframe:!1}),e.position.x+=(Math.random()-.5)*.2,e.position.y+=(Math.random()-.5)*.2,e.position.z+=(Math.random()-.5)*.2,e.userData.velocity=new v((Math.random()-.5)*.001,(Math.random()-.5)*.001,(Math.random()-.5)*.001),e.userData.rotationSpeed=new v((Math.random()-.5)*.001,(Math.random()-.5)*.001,(Math.random()-.5)*.001),M.push(e)}})});function b(){const t=g.getElapsedTime(),n=g.getDelta();A.forEach(o=>o.update(n));let e=0;if(l){const o=new Uint8Array(l.frequencyBinCount);l.getByteFrequencyData(o),e=o.reduce((r,s)=>r+s,0)/o.length/256}let i=0;if(c){const o=new Uint8Array(c.frequencyBinCount);c.getByteFrequencyData(o),i=o.reduce((r,s)=>r+s,0)/o.length/256}const a=5;f.position.x=a*Math.cos(t*.2),f.position.z=a*Math.sin(t*.15),f.position.y=2+Math.sin(t*.8),M.forEach(o=>{o.position.add(o.userData.velocity),o.rotation.x+=o.userData.rotationSpeed.x,o.rotation.y+=o.userData.rotationSpeed.y,o.rotation.z+=o.userData.rotationSpeed.z,o.material.uniforms.time.value=t,o.material.uniforms.audioAmplitude.value=e,o.material.uniforms.audioAmplitude2.value=i,o.material.uniforms.uCameraPosition.value.copy(m.position)}),p.render()}window.addEventListener("resize",()=>{m.aspect=window.innerWidth/window.innerHeight,m.updateProjectionMatrix(),p.setSize(window.innerWidth,window.innerHeight)});document.addEventListener("visibilitychange",()=>{document.hidden?d.setAnimationLoop(null):d.setAnimationLoop(b)});async function F(){const t="p1/patch.export.json",n=window.AudioContext||window.webkitAudioContext,e=new n,i=e.createGain();i.connect(e.destination);let a,o;try{a=await fetch(t),o=await a.json(),window.RNBO||await G(o.desc.meta.rnboversion)}catch(s){console.error("Fehler beim Laden des Patchers:",s);return}let u;try{u=await RNBO.createDevice({context:e,patcher:o})}catch(s){console.error("Fehler beim Erstellen des RNBO-Geräts:",s);return}u.node.disconnect();const r=e.createChannelSplitter(4);u.node.connect(r),r.connect(i,0),r.connect(i,1),l=e.createAnalyser(),c=e.createAnalyser(),l.fftSize=256,c.fftSize=256,r.connect(l,0),r.connect(c,1),document.body.onclick=()=>{e.resume()}}function G(t){return new Promise((n,e)=>{if(/^\d+\.\d+\.\d+-dev$/.test(t))throw new Error("Patcher wurde mit einer Debug-Version exportiert! Bitte die korrekte RNBO-Version angeben.");const i=document.createElement("script");i.src="https://c74-public.nyc3.digitaloceanspaces.com/rnbo/"+encodeURIComponent(t)+"/rnbo.min.js",i.onload=n,i.onerror=function(a){console.error("Fehler beim Laden von rnbo.js:",a),e(new Error("Laden von rnbo.js v"+t+" fehlgeschlagen."))},document.body.appendChild(i)})}F();

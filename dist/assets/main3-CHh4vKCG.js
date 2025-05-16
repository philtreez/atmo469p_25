import{I as be,F as se,k as J,l as B,m as _e,n as Q,o as pe,d,c as Ee,p as I,q as he,V as ee,r as N,s as ze,t as T,L as Ae,u as Le,j as Me,S as Ue,P as Be,v as me,W as De,f as Pe,e as Oe,G as Ce,b as oe,w as We,M as Te,x as Re,E as je,R as Fe,A as Ie,U as Ne,C as He}from"./AfterimagePass-C26vPaU7.js";import{O as Ge}from"./OrbitControls-OHg80xYR.js";const ae=new Q,R=new d;class we extends be{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],i=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],t=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(t),this.setAttribute("position",new se(e,3)),this.setAttribute("uv",new se(i,2))}applyMatrix4(e){const i=this.attributes.instanceStart,t=this.attributes.instanceEnd;return i!==void 0&&(i.applyMatrix4(e),t.applyMatrix4(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let i;e instanceof Float32Array?i=e:Array.isArray(e)&&(i=new Float32Array(e));const t=new J(i,6,1);return this.setAttribute("instanceStart",new B(t,3,0)),this.setAttribute("instanceEnd",new B(t,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let i;e instanceof Float32Array?i=e:Array.isArray(e)&&(i=new Float32Array(e));const t=new J(i,6,1);return this.setAttribute("instanceColorStart",new B(t,3,0)),this.setAttribute("instanceColorEnd",new B(t,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new _e(e.geometry)),this}fromLineSegments(e){const i=e.geometry;return this.setPositions(i.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Q);const e=this.attributes.instanceStart,i=this.attributes.instanceEnd;e!==void 0&&i!==void 0&&(this.boundingBox.setFromBufferAttribute(e),ae.setFromBufferAttribute(i),this.boundingBox.union(ae))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new pe),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,i=this.attributes.instanceEnd;if(e!==void 0&&i!==void 0){const t=this.boundingSphere.center;this.boundingBox.getCenter(t);let n=0;for(let s=0,a=e.count;s<a;s++)R.fromBufferAttribute(e,s),n=Math.max(n,t.distanceToSquared(R)),R.fromBufferAttribute(i,s),n=Math.max(n,t.distanceToSquared(R));this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}N.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new ee(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};I.line={uniforms:he.merge([N.common,N.fog,N.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class te extends Ee{constructor(e){super({type:"LineMaterial",uniforms:he.clone(I.line.uniforms),vertexShader:I.line.vertexShader,fragmentShader:I.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const X=new T,re=new d,ce=new d,p=new T,h=new T,w=new T,Y=new d,Z=new Le,m=new Ae,le=new d,j=new Q,F=new pe,g=new T;let v,z;function de(o,e,i){return g.set(0,0,-e,1).applyMatrix4(o.projectionMatrix),g.multiplyScalar(1/g.w),g.x=z/i.width,g.y=z/i.height,g.applyMatrix4(o.projectionMatrixInverse),g.multiplyScalar(1/g.w),Math.abs(Math.max(g.x,g.y))}function ke(o,e){const i=o.matrixWorld,t=o.geometry,n=t.attributes.instanceStart,s=t.attributes.instanceEnd,a=Math.min(t.instanceCount,n.count);for(let c=0,u=a;c<u;c++){m.start.fromBufferAttribute(n,c),m.end.fromBufferAttribute(s,c),m.applyMatrix4(i);const l=new d,r=new d;v.distanceSqToSegment(m.start,m.end,r,l),r.distanceTo(l)<z*.5&&e.push({point:r,pointOnLine:l,distance:v.origin.distanceTo(r),object:o,face:null,faceIndex:c,uv:null,uv1:null})}}function Ve(o,e,i){const t=e.projectionMatrix,s=o.material.resolution,a=o.matrixWorld,c=o.geometry,u=c.attributes.instanceStart,l=c.attributes.instanceEnd,r=Math.min(c.instanceCount,u.count),f=-e.near;v.at(1,w),w.w=1,w.applyMatrix4(e.matrixWorldInverse),w.applyMatrix4(t),w.multiplyScalar(1/w.w),w.x*=s.x/2,w.y*=s.y/2,w.z=0,Y.copy(w),Z.multiplyMatrices(e.matrixWorldInverse,a);for(let x=0,$=r;x<$;x++){if(p.fromBufferAttribute(u,x),h.fromBufferAttribute(l,x),p.w=1,h.w=1,p.applyMatrix4(Z),h.applyMatrix4(Z),p.z>f&&h.z>f)continue;if(p.z>f){const L=p.z-h.z,_=(p.z-f)/L;p.lerp(h,_)}else if(h.z>f){const L=h.z-p.z,_=(h.z-f)/L;h.lerp(p,_)}p.applyMatrix4(t),h.applyMatrix4(t),p.multiplyScalar(1/p.w),h.multiplyScalar(1/h.w),p.x*=s.x/2,p.y*=s.y/2,h.x*=s.x/2,h.y*=s.y/2,m.start.copy(p),m.start.z=0,m.end.copy(h),m.end.z=0;const ne=m.closestPointToPointParameter(Y,!0);m.at(ne,le);const ie=Me.lerp(p.z,h.z,ne),xe=ie>=-1&&ie<=1,Se=Y.distanceTo(le)<z*.5;if(xe&&Se){m.start.fromBufferAttribute(u,x),m.end.fromBufferAttribute(l,x),m.start.applyMatrix4(a),m.end.applyMatrix4(a);const L=new d,_=new d;v.distanceSqToSegment(m.start,m.end,_,L),i.push({point:_,pointOnLine:L,distance:v.origin.distanceTo(_),object:o,face:null,faceIndex:x,uv:null,uv1:null})}}}class $e extends ze{constructor(e=new we,i=new te({color:Math.random()*16777215})){super(e,i),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,i=e.attributes.instanceStart,t=e.attributes.instanceEnd,n=new Float32Array(2*i.count);for(let a=0,c=0,u=i.count;a<u;a++,c+=2)re.fromBufferAttribute(i,a),ce.fromBufferAttribute(t,a),n[c]=c===0?0:n[c-1],n[c+1]=n[c]+re.distanceTo(ce);const s=new J(n,2,1);return e.setAttribute("instanceDistanceStart",new B(s,1,0)),e.setAttribute("instanceDistanceEnd",new B(s,1,1)),this}raycast(e,i){const t=this.material.worldUnits,n=e.camera;n===null&&!t&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const s=e.params.Line2!==void 0&&e.params.Line2.threshold||0;v=e.ray;const a=this.matrixWorld,c=this.geometry,u=this.material;z=u.linewidth+s,c.boundingSphere===null&&c.computeBoundingSphere(),F.copy(c.boundingSphere).applyMatrix4(a);let l;if(t)l=z*.5;else{const f=Math.max(n.near,F.distanceToPoint(v.origin));l=de(n,f,u.resolution)}if(F.radius+=l,v.intersectsSphere(F)===!1)return;c.boundingBox===null&&c.computeBoundingBox(),j.copy(c.boundingBox).applyMatrix4(a);let r;if(t)r=z*.5;else{const f=Math.max(n.near,j.distanceToPoint(v.origin));r=de(n,f,u.resolution)}j.expandByScalar(r),v.intersectsBox(j)!==!1&&(t?ke(this,i):Ve(this,n,i))}onBeforeRender(e){const i=this.material.uniforms;i&&i.resolution&&(e.getViewport(X),this.material.uniforms.resolution.value.set(X.z,X.w))}}class ge extends we{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const i=e.length-3,t=new Float32Array(2*i);for(let n=0;n<i;n+=3)t[2*n]=e[n],t[2*n+1]=e[n+1],t[2*n+2]=e[n+2],t[2*n+3]=e[n+3],t[2*n+4]=e[n+4],t[2*n+5]=e[n+5];return super.setPositions(t),this}setColors(e){const i=e.length-3,t=new Float32Array(2*i);for(let n=0;n<i;n+=3)t[2*n]=e[n],t[2*n+1]=e[n+1],t[2*n+2]=e[n+2],t[2*n+3]=e[n+3],t[2*n+4]=e[n+4],t[2*n+5]=e[n+5];return super.setColors(t),this}setFromPoints(e){const i=e.length-1,t=new Float32Array(6*i);for(let n=0;n<i;n++)t[6*n]=e[n].x,t[6*n+1]=e[n].y,t[6*n+2]=e[n].z||0,t[6*n+3]=e[n+1].x,t[6*n+4]=e[n+1].y,t[6*n+5]=e[n+1].z||0;return super.setPositions(t),this}fromLine(e){const i=e.geometry;return this.setPositions(i.attributes.position.array),this}}class qe extends $e{constructor(e=new ge,i=new te({color:Math.random()*16777215})){super(e,i),this.isLine2=!0,this.type="Line2"}}let y,b,E,G,D,O,S;const fe=new He,K={},C={},k=128;let P=null,A,U,ye=[],M,V,W,H,ue=.68;Xe();ve();it();function Xe(){y=new Ue,b=new Be(75,window.innerWidth/window.innerHeight,.1,1e3),b.position.set(8,10,-22),U=new me,U.position.copy(b.position),U.rotation.y=Math.PI/1.5,U.add(b),y.add(U),E=new De({antialias:!0}),E.shadowMap.enabled=!0,E.setSize(window.innerWidth,window.innerHeight),document.body.appendChild(E.domElement),O=new Ge(b,E.domElement),O.target.set(0,0,0),O.autoRotate=!1,O.update();const o=new Pe(16777215,.1);y.add(o),W=new Oe(16765993,0),W.position.set(5,10,-25),W.castShadow=!0,y.add(W);const e=new Ce;e.load("pi30.glb",t=>{S=t.scene,S.scale.set(4.5,4.5,4.5),S.position.set(0,-1,0),S.rotation.set(0,Math.PI,0),S.traverse(s=>{s.isMesh&&(s.castShadow=!0,s.receiveShadow=!0)}),y.add(S),G=new oe(S);const n=t.animations;n.length>0&&n.forEach(s=>{const a=G.clipAction(s);a.loop=We,a.clampWhenFinished=!0,a.play(),a.paused=!0,a.setTime(0),ye.push(a)})},void 0,t=>{console.error("Fehler beim Laden von pi25.glb:",t)}),e.load("sxx.glb",t=>{const n=new Te({color:14549036,emissive:16768847,emissiveIntensity:.8,transparent:!0,opacity:0,metalness:.5,roughness:.5,wireframe:!0});t.scene.traverse(s=>{s.isMesh&&/^[1-9]$/.test(s.name)&&(s.material=n.clone(),s.material.transparent=!0,K[s.name]=s)}),t.scene.position.set(0,0,0),t.scene.scale.set(5,5,5),y.add(t.scene)},void 0,t=>{console.error("Fehler beim Laden von ixers2.glb:",t)}),e.load("benz3.glb",t=>{M=t.scene,M.position.set(0,0,0),M.scale.set(8,8,8),M.traverse(s=>{s.name==="light"&&s.isMesh&&(s.material=s.material.clone(),s.material.color.set(268424233),s.material.emissive.set(16775648),s.material.emissiveIntensity=6)}),y.add(M),V=new oe(M);const n=t.animations;if(n.length>0){const s=V.clipAction(n[0]);s.loop=Re,s.play()}},void 0,t=>{console.error("Fehler beim Laden von benz3.glb:",t)}),e.load("guiti.glb",t=>{const n=t.scene;n.position.set(0,0,0),n.scale.set(.7,.7,.7),n.wireframe=!0,n.traverse(s=>{s.isMesh&&/^[1-8]$/.test(s.name)&&(s.visible=!1,console.log(`Mesh ${s.name} wird eingefügt und initial versteckt.`),C[s.name]=s)}),y.add(n)},void 0,t=>{console.error("Fehler beim Laden des neuen GLB:",t)}),Ze(5,1),D=new je(E),D.addPass(new Fe(y,b)),H=new Ie,H.uniforms.damp.value=.88,D.addPass(H);const i=new Ne(new ee(window.innerWidth,window.innerHeight),1.9,.2,.05);D.addPass(i),window.addEventListener("resize",Je)}function Ye(o){const e=[];for(let s=0;s<k;s++){const a=s/(k-1),c=o.start.x+(o.end.x-o.start.x)*a,u=0,l=o.start.z+(o.end.z-o.start.z)*a;e.push(c,u,l)}const i=new ge;i.setPositions(e);const t=new te({color:12517427,linewidth:3,resolution:new ee(window.innerWidth,window.innerHeight)}),n=new qe(i,t);return n.userData.edge=o,n}function Ze(o=5,e=1){A=new me;for(let i=0;i<o;i++){const t=2+i*e;[{start:new d(-4*t,0,4*t),end:new d(4*t,0,4*t),normal:new d(0,1,0)},{start:new d(4*t,0,4*t),end:new d(4*t,0,-4*t),normal:new d(0,1,0)},{start:new d(4*t,0,-4*t),end:new d(-4*t,0,-4*t),normal:new d(0,1,0)},{start:new d(-4*t,0,-4*t),end:new d(-4*t,0,4*t),normal:new d(0,1,0)}].forEach(s=>{const a=Ye(s);A.add(a)})}y.add(A)}function Je(){b.aspect=window.innerWidth/window.innerHeight,b.updateProjectionMatrix(),E.setSize(window.innerWidth,window.innerHeight),D.setSize(window.innerWidth,window.innerHeight),A&&A.children.forEach(o=>{o.material&&o.material.resolution&&o.material.resolution.set(window.innerWidth,window.innerHeight)})}function ve(){requestAnimationFrame(ve);const o=fe.getDelta();if(G&&G.update(o),V&&V.update(o),S&&(S.rotation.y+=.005),O.update(),P&&A){const t=new Uint8Array(P.frequencyBinCount);P.getByteTimeDomainData(t),A.children.forEach(n=>{const{start:s,end:a,normal:c}=n.userData.edge,u=[];for(let l=0;l<k;l++){const r=l/(k-1),f=s.x+(a.x-s.x)*r,x=0,$=s.z+(a.z-s.z)*r;let q=(t[l]-128)/128;q*=7,u.push(f,x+c.y*q,$)}n.geometry.setPositions(u)})}const e=fe.getElapsedTime(),i=5.5;U.position.set(i*Math.sin(e*.8),18+i*Math.cos(e*.7),-18+i*Math.sin(e*.9)),D.render()}function Ke(o){W.intensity=o}function Qe(o){if(o===0)return;const e=o.toString();for(const i in K)K[i].material.opacity=i===e?1:0}function et(o){if(console.log("handleLighty2 wird aufgerufen mit Wert:",o),o<1||o>8){for(const i in C)C[i].visible=!1,console.log(`Mesh ${i} wird versteckt.`);return}const e=o.toString();for(const i in C)C[i].visible=i===e,console.log(`Mesh ${i} wird ${i===e?"sichtbar":"versteckt"}.`)}function tt(o){ye.forEach(e=>{e.paused=!1})}function nt(o){ue=o,H.uniforms.damp.value=ue}async function it(){const o="six/patch.export.json",e=window.AudioContext||window.webkitAudioContext,i=new e,t=i.createGain();t.connect(i.destination);let n,s;try{n=await fetch(o),s=await n.json(),window.RNBO||await st(s.desc.meta.rnboversion)}catch(r){console.error("Fehler beim Laden des Patchers:",r);return}let a=[];try{a=await(await fetch("six/dependencies.json")).json(),a=a.map(f=>f.file?Object.assign({},f,{file:"six/"+f.file}):f)}catch{}let c;try{c=await RNBO.createDevice({context:i,patcher:s})}catch(r){console.error("Fehler beim Erstellen des RNBO Device:",r);return}c.node.disconnect();const l=i.createChannelSplitter(4);c.node.connect(l),l.connect(t,0),l.connect(t,1),P=i.createAnalyser(),P.fftSize=256,l.connect(P,2),a.length&&await c.loadDataBufferDependencies(a),c.messageEvent.subscribe(r=>{r.tag==="six"&&(console.log(`RNBO Outport "six": ${r.payload}`),Qe(r.payload)),r.tag==="anim1"&&(console.log(`RNBO Outport "anim1": ${r.payload}`),tt(r.payload)),r.tag==="lighty"&&(console.log(`RNBO Outport "lighty": ${r.payload}`),Ke(r.payload)),r.tag==="afterimageDamp"&&(console.log(`RNBO Outport "afterimageDamp": ${r.payload}`),nt(r.payload)),r.tag==="lighty2"&&(console.log(`RNBO Outport "lighty2": ${r.payload}`),et(r.payload))}),document.body.onclick=()=>{i.resume()}}function st(o){return new Promise((e,i)=>{if(/^\d+\.\d+\.\d+-dev$/.test(o))throw new Error("Patcher exported with a Debug Version! Please specify the correct RNBO version.");const t=document.createElement("script");t.src="https://c74-public.nyc3.digitaloceanspaces.com/rnbo/"+encodeURIComponent(o)+"/rnbo.min.js",t.onload=e,t.onerror=function(n){console.error(n),i(new Error("Failed to load rnbo.js v"+o))},document.body.append(t)})}

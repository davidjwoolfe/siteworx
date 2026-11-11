'use strict';
// WebGL2 renderer. Walls come from a CPU raycast (one ray per screen column, uploaded as a 1-pixel-high float texture);
// the fragment shader turns that into textured, lightmapped walls and casts floors and ceilings per pixel.
// Sprites are billboards clipped against the same per-column depth, exactly as in a classic raycaster.
const Renderer = (() => {
let gl, pMain, pSpr, uM = {}, uS = {}, colTex, wallTex, sprTex, lightTex, cellTex, vao, sprVao, sprBuf, colW = 0, L;
const VS = `#version 300 es
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.-1.,0.,1.); }`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DArray;
uniform sampler2D uCol, uLight, uCells; uniform sampler2DArray uTex;
uniform vec2 uRes, uPos, uDir, uPlane, uMap; uniform float uProjH, uPlaneLen; uniform vec3 uFlash;
out vec4 o;
vec3 lit(vec4 t, vec3 l, float d){
  float e=clamp((1.-t.a)/.7,0.,1.);
  vec3 c=t.rgb*mix(l*exp(-d*.05), vec3(1.25)*exp(-d*.02), e);
  return 1.-exp(-c*1.75);
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  float camX=2.*fc.x/uRes.x-1.;
  vec2 ray=uDir+uPlane*camX;
  vec4 c=texelFetch(uCol,ivec2(int(fc.x),0),0);
  float yc=fc.y-uRes.y*.5, ay=max(abs(yc),.5);
  float halfH=.5*uProjH/c.r;
  // floor / ceiling
  float rd=.5*uProjH/ay;
  vec2 wp=uPos+ray*rd;
  vec2 cl=texelFetch(uCells,ivec2(clamp(floor(wp),vec2(0.),uMap-1.)),0).rg*255.;
  vec4 ft=textureGrad(uTex,vec3(wp,floor((yc<0.?cl.r:cl.g)+.5)),uPlane*(2./uRes.x)*rd,ray*(rd/ay));
  vec3 fcol=lit(ft,texture(uLight,wp/uMap).rgb+uFlash/(1.+rd*rd*.45),rd);
  // wall
  vec2 hp=uPos+ray*c.r;
  float v=.5-yc/(2.*halfH);
  float gu=uPlaneLen*c.r/max(abs(c.a<.5?ray.x:ray.y),.03)*2./uRes.x;
  vec4 wt=textureGrad(uTex,vec3(c.b,v,c.g),vec2(gu,0.),vec2(0.,1./(2.*halfH)));
  float ao=(.62+.38*smoothstep(0.,.16,1.-v))*(.8+.2*smoothstep(0.,.1,v));
  vec3 wl=texture(uLight,hp/uMap).rgb*(c.a<.5?1.:.84)*ao+uFlash/(1.+c.r*c.r*.45);
  vec3 wcol=lit(wt,wl,c.r);
  vec3 col=mix(fcol,wcol,clamp(halfH-abs(yc)+.5,0.,1.));
  vec2 q=fc/uRes-.5; col*=1.-.55*dot(q,q);
  col+=(fract(sin(dot(fc,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;
  o=vec4(col,1.);
}`;
const SVS = `#version 300 es
layout(location=0) in vec2 aPos; layout(location=1) in vec3 aUV; layout(location=2) in float aDepth; layout(location=3) in vec4 aCol;
out vec3 vUV; out float vDepth; out vec4 vCol;
void main(){ vUV=aUV; vDepth=aDepth; vCol=aCol; gl_Position=vec4(aPos,0.,1.); }`;
const SFS = `#version 300 es
precision highp float; precision highp sampler2DArray;
uniform sampler2D uCol; uniform sampler2DArray uSpr;
in vec3 vUV; in float vDepth; in vec4 vCol; out vec4 o;
void main(){
  if(vDepth>texelFetch(uCol,ivec2(int(gl_FragCoord.x),0),0).r) discard;
  vec4 t=texture(uSpr,vUV);
  if(t.a<.004) discard;
  if(vCol.a>0.){ vec3 c=t.rgb/max(t.a,.001)*vCol.rgb; c=1.-exp(-c*1.75); o=vec4(c*t.a*vCol.a,t.a*vCol.a); }
  else o=vec4(t.rgb*vCol.rgb,0.);
}`;
function prog(vs, fs) {
  const p = gl.createProgram();
  for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function uniforms(p, names) { const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n); return u; }
function arrayTex(size, count, fill) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.floor(Math.log2(size)) + 1, gl.RGBA8, size, size, count);
  for (let i = 0; i < count; i++) fill(i);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const ext = gl.getExtension('EXT_texture_filter_anisotropic'); if (ext) gl.texParameterf(gl.TEXTURE_2D_ARRAY, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return t;
}
function dataTex(filter) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
function init(canvas) {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', desynchronized: true });
  if (!gl) throw new Error('WebGL2 is required');
  pMain = prog(VS, FS); pSpr = prog(SVS, SFS);
  uM = uniforms(pMain, ['uCol', 'uLight', 'uCells', 'uTex', 'uRes', 'uPos', 'uDir', 'uPlane', 'uMap', 'uProjH', 'uPlaneLen', 'uFlash']);
  uS = uniforms(pSpr, ['uCol', 'uSpr']);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  wallTex = arrayTex(Art.TS, Art.texList.length, i => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, Art.TS, Art.TS, 1, gl.RGBA, gl.UNSIGNED_BYTE, Art.texPixels(i)));
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  sprTex = arrayTex(Art.SS, Art.sprList.length, i => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, Art.SS, Art.SS, 1, gl.RGBA, gl.UNSIGNED_BYTE, Art.sprList[i]));
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  colTex = dataTex(gl.NEAREST); lightTex = dataTex(gl.LINEAR); cellTex = dataTex(gl.NEAREST);
  vao = gl.createVertexArray();
  sprVao = gl.createVertexArray(); gl.bindVertexArray(sprVao); sprBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf);
  const st = 40; [[0, 2, 0], [1, 3, 8], [2, 1, 20], [3, 4, 24]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, st, o); });
  gl.bindVertexArray(null);
}
function setLevel(level) {
  L = level; const d = new Uint8Array(L.MW * L.MH * 2);
  for (let i = 0; i < L.MW * L.MH; i++) { d[i * 2] = L.floorTex[i]; d[i * 2 + 1] = L.ceilTex[i]; }
  gl.bindTexture(gl.TEXTURE_2D, cellTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, L.MW, L.MH, 0, gl.RG, gl.UNSIGNED_BYTE, d);
  gl.bindTexture(gl.TEXTURE_2D, lightTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, L.LW, L.LH, 0, gl.RGB, gl.FLOAT, L.lm);
}
function updateCells() { const d = new Uint8Array(L.MW * L.MH * 2); for (let i = 0; i < L.MW * L.MH; i++) { d[i * 2] = L.floorTex[i]; d[i * 2 + 1] = L.ceilTex[i]; } gl.bindTexture(gl.TEXTURE_2D, cellTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, L.MW, L.MH, gl.RG, gl.UNSIGNED_BYTE, d); }
// view: {x,y,dx,dy,px,py,planeLen,projH,flash:[r,g,b]}  cols: Float32Array(W*4)  sprites: Float32Array of vertices
function draw(W, H, view, cols, sprVerts, sprCount) {
  gl.viewport(0, 0, W, H);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, colTex);
  if (colW !== W) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, 1, 0, gl.RGBA, gl.FLOAT, cols.subarray(0, W * 4)); colW = W; }
  else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, 1, gl.RGBA, gl.FLOAT, cols.subarray(0, W * 4));
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, lightTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, L.LW, L.LH, gl.RGB, gl.FLOAT, L.lm);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, cellTex);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D_ARRAY, wallTex);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D_ARRAY, sprTex);
  gl.disable(gl.BLEND);
  gl.useProgram(pMain); gl.bindVertexArray(vao);
  gl.uniform1i(uM.uCol, 0); gl.uniform1i(uM.uLight, 1); gl.uniform1i(uM.uCells, 2); gl.uniform1i(uM.uTex, 3);
  gl.uniform2f(uM.uRes, W, H); gl.uniform2f(uM.uPos, view.x, view.y); gl.uniform2f(uM.uDir, view.dx, view.dy); gl.uniform2f(uM.uPlane, view.px, view.py);
  gl.uniform2f(uM.uMap, L.MW, L.MH); gl.uniform1f(uM.uProjH, view.projH); gl.uniform1f(uM.uPlaneLen, view.planeLen); gl.uniform3fv(uM.uFlash, view.flash);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (sprCount) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(pSpr); gl.uniform1i(uS.uCol, 0); gl.uniform1i(uS.uSpr, 4);
    gl.bindVertexArray(sprVao); gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf); gl.bufferData(gl.ARRAY_BUFFER, sprVerts.subarray(0, sprCount * 60), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, sprCount * 6);
  }
  gl.bindVertexArray(null);
}
return { init, setLevel, updateCells, draw };
})();

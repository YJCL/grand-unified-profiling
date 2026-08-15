"use client";

import { useEffect, useRef, useState } from "react";

const vertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}
`;

const fragment = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
varying vec2 vUv;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise3(p);p=p*2.03+vec3(1.7,2.9,.8);a*=.5;}return v;}
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
void main(){
 vec2 p=(vUv-.5)*2.;p.x*=uResolution.x/max(uResolution.y,1.);float r=.82,d=length(p);if(d>r)discard;
 float z=sqrt(max(r*r-dot(p,p),0.));vec3 n=normalize(vec3(p,z));float t=uTime*.18;n.xz=rot(t*.21)*n.xz;n.xy=rot(-.28+sin(t*.13)*.08)*n.xy;
 float cloud=fbm(n*3.15+vec3(t*.13,-t*.08,t*.06));float detail=fbm(n*7.4+vec3(-t*.04,t*.11,1.8));float structure=smoothstep(.28,.9,cloud*.78+detail*.34);
 vec3 ld=normalize(vec3(-.52,.7,1.15));float diff=max(dot(n,ld),0.);float fres=pow(1.-max(z/r,0.),2.55);float hot=pow(diff,5.);
 vec3 deep=vec3(.055,.045,.13),violet=vec3(.23,.16,.38),gold=vec3(.96,.62,.24),ivory=vec3(1.,.965,.82);
 vec3 color=mix(deep,violet,structure);color=mix(color,gold,diff*(.28+structure*.42));color+=ivory*hot*.72;color+=vec3(.32,.23,.58)*fres*.52;color*=.72+diff*.54;
 float alpha=(1.-smoothstep(r-.018,r,d))*(.94+fres*.06);gl_FragColor=vec4(color,alpha);
}`;

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const item = gl.createShader(type);
  if (!item) return null;
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) return null;
  return item;
}

export function BrandOrb() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!canvas || !gl) return;
    const vs = shader(gl, gl.VERTEX_SHADER, vertex);
    const fs = shader(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "aPosition");
    const resolution = gl.getUniformLocation(program, "uResolution");
    const time = gl.getUniformLocation(program, "uTime");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    let visible = true;
    const draw = (now: number) => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(resolution, width, height);
      gl.uniform1f(time, reduced ? 0 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduced && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) frame = requestAnimationFrame(draw);
    });
    observer.observe(canvas);
    setReady(true);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div className={`brand-orb${ready ? " is-ready" : ""}`}>
      <div className="brand-orb__fallback" />
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}

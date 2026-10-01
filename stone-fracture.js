/* The approved artwork is the front texture of closed, irregular stone meshes.
   This is a fracture effect, not a replacement model of the two sculptures. */
(() => {
  const data = window.ROOM01_STONE_DATA;
  const host = document.querySelector('.sculpture-art');
  const fallback = host?.querySelector('.sculpture-foreground');
  if (!data || !host || !fallback) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'stone-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.closest('.cover-stage').append(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  let ready = false;
  let progress = 0;
  let reduced = false;
  let width = 0;
  let height = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t*t*(3-2*t); };
  const noise = n => { const x = Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
  const fail = () => {
    ready = false;
    host.classList.remove('has-stone-renderer');
    canvas.hidden = true;
    fallback.style.width = '';
    fallback.style.height = '';
    fallback.style.opacity = String(1-smooth(progress/.24));
    host.dataset.fractureRenderer = 'static-fallback';
  };
  const api = window.room01Fracture = {
    setProgress(value, reduceMotion) {
      progress = clamp(value);
      reduced = reduceMotion;
      host.dataset.fractureProgress = progress.toFixed(3);
      if (!ready) {
        fallback.style.opacity = String(1-smooth(progress/.24));
        return;
      }
      render();
    }
  };
  if (!gl) { fail(); return; }

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const vertex = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aUv;
    attribute float aStone;
    uniform mat3 uRotation;
    uniform vec3 uCenter;
    uniform vec3 uTravel;
    uniform vec2 uView;
    uniform vec2 uOffset;
    uniform float uScale;
    uniform float uShrink;
    varying vec3 vNormal;
    varying vec3 vLocal;
    varying vec2 vUv;
    varying float vStone;
    void main() {
      vec3 point = uRotation*(aPosition*uShrink)+uCenter+uTravel;
      float perspective = (2400.0-point.z)/2400.0;
      gl_Position = vec4((point.xy*uScale+uOffset*perspective)*2.0/uView, -point.z/3500.0, perspective);
      vNormal = uRotation*aNormal;
      vLocal = aPosition;
      vUv = aUv;
      vStone = aStone;
    }`;
  const fragment = `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform float uBroken;
    varying vec3 vNormal;
    varying vec3 vLocal;
    varying vec2 vUv;
    varying float vStone;
    float grain(vec3 p) { return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
    void main() {
      vec3 normal = normalize(vNormal);
      float diffuse = max(0.0, dot(normal,normalize(vec3(-0.55,0.85,1.2))));
      if (vStone < 0.5) {
        vec4 tex = texture2D(uTexture,vUv);
        if (tex.a < 0.5) discard;
        float gray = dot(tex.rgb,vec3(.299,.587,.114));
        gray = (gray-.5)*1.06+.5;
        float light = mix(1.0,.37+.74*diffuse,uBroken);
        gl_FragColor = vec4(vec3(gray)*light,1.0);
      } else {
        float roughness = grain(floor(vLocal*1.3));
        float vein = sin(vLocal.x*.16+sin(vLocal.y*.09)*3.0+vLocal.z*.2);
        vec3 chalk = vec3(.66,.65,.62)+(roughness-.5)*.12;
        chalk -= step(.94,vein)*.065;
        gl_FragColor = vec4(chalk*(.29+.78*diffuse),1.0);
      }
    }`;
  let program;
  const meshes = [];
  const uniforms = {};
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    ['Rotation','Center','Travel','View','Offset','Scale','Shrink','Broken','Texture'].forEach(name => {
      uniforms[name] = gl.getUniformLocation(program, 'u'+name);
    });
    const attributes = [['aPosition',3,0],['aNormal',3,12],['aUv',2,24],['aStone',1,32]];
    for (const [name,size,offset] of attributes) {
      const location = gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(location);
      attributes.find(entry => entry[0]===name).push(location);
    }
    data.pieces.forEach((piece, index) => {
      const cx = piece.points.reduce((sum,p)=>sum+p[0],0)/piece.points.length;
      const cy = piece.points.reduce((sum,p)=>sum+p[1],0)/piece.points.length;
      const depth = 24+noise(index+9)*49;
      const vertices = [];
      const point = (i,z,contract=1) => [(piece.points[i][0]-cx)*contract,(cy-piece.points[i][1])*contract,z];
      const addFace = (a,b,c,uvs,stone) => {
        const u = b.map((x,i)=>x-a[i]), v = c.map((x,i)=>x-a[i]);
        const normal = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        const length = Math.hypot(...normal)||1;
        [a,b,c].forEach((p,i)=>vertices.push(...p,...normal.map(n=>n/length),...uvs[i],stone));
      };
      const uv = i => [piece.points[i][0]/data.width,piece.points[i][1]/data.height];
      // Bevels leave a narrow angled break around the textured surface.
      const rings = [{z:0,k:1},{z:-5,k:.96},{z:-depth+6,k:.84},{z:-depth,k:.72}];
      piece.triangles.forEach(([a,b,c]) => {
        addFace(point(c,0),point(b,0),point(a,0),[uv(c),uv(b),uv(a)],0);
        addFace(point(a,-depth,.72),point(b,-depth,.72),point(c,-depth,.72),[uv(a),uv(b),uv(c)],1);
      });
      for (let ring=0;ring<rings.length-1;ring++) {
        const front=rings[ring],back=rings[ring+1];
        for (let a=0;a<piece.points.length;a++) {
          const b=(a+1)%piece.points.length;
          addFace(point(a,front.z,front.k),point(b,front.z,front.k),point(b,back.z,back.k),[uv(a),uv(b),uv(b)],1);
          addFace(point(a,front.z,front.k),point(b,back.z,back.k),point(a,back.z,back.k),[uv(a),uv(b),uv(a)],1);
        }
      }
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      const direction = Math.atan2(data.height/2-cy,cx-data.width/2);
      meshes.push({buffer,count:vertices.length/9,cx,cy,index,direction,attributes});
    });
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const image = new Image();
    image.onload = () => {
      try {
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0,0,0,0);
        ready=true;
        host.classList.add('has-stone-renderer');
        host.dataset.fractureRenderer='webgl-stone';
        host.dataset.stoneCount=String(meshes.length);
        render();
      } catch (error) { console.warn('Stone texture unavailable',error); fail(); }
    };
    image.onerror=fail;
    image.src=data.texture;
  } catch (error) { console.warn('Stone renderer unavailable',error); fail(); }

  function rotation(x,y,z) {
    const a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z);
    return [c*e,c*f,-d,b*d*e-a*f,b*d*f+a*e,b*c,a*d*e+b*f,a*d*f-b*e,a*c];
  }

  function render() {
    const box=host.getBoundingClientRect();
    const viewport=canvas.getBoundingClientRect();
    width=viewport.width; height=viewport.height;
    if (!width||!height) return;
    const dpr=Math.min(window.devicePixelRatio||1,1.75);
    if (canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)) {
      canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    }
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const scale=Math.min(box.height*.94/data.height,box.width*.9/760);
    fallback.style.width=`${data.width*scale}px`;
    fallback.style.height=`${data.height*scale}px`;
    host.classList.toggle('is-fracturing',progress>0&&!reduced);
    // At rest use the untouched cutout. Ownership switches atomically; the
    // intact image is never rendered underneath moving fragments.
    canvas.style.visibility=progress>0&&!reduced?'visible':'hidden';
    fallback.style.opacity=reduced?String(1-smooth(progress/.3)):'1';
    // The final part of the pinned section is genuinely empty, including the depth buffer.
    if (progress>=.96) return;
    gl.useProgram(program);
    gl.uniform2f(uniforms.View,width,height);
    gl.uniform2f(uniforms.Offset,box.left+box.width/2-viewport.left-width/2,-(box.top+box.height/2-viewport.top-height/2));
    gl.uniform1f(uniforms.Scale,scale);
    gl.uniform1i(uniforms.Texture,0);
    if (reduced||progress===0) return;
    canvas.style.opacity='1';
    const motion=reduced?0:progress;
    gl.uniform1f(uniforms.Broken,smooth(motion/.13));
    for (const mesh of meshes) {
      const {index,cx,cy,direction}=mesh;
      const spread=smooth((motion-.025)/.89);
      const crack=smooth(motion/.18);
      // Every shard leaves radially. The distance uses the current viewport so
      // the burst clears both a wide desktop and a tall phone before unpinning.
      const exitDistance=Math.hypot(width,height)/scale*1.16;
      const distance=crack*14+Math.pow(spread,1.15)*exitDistance*(.78+noise(index+45)*.5);
      const angle=direction+(noise(index+82)-.5)*.4;
      const tx=Math.cos(angle)*distance;
      const ty=Math.sin(angle)*distance;
      const tz=spread*(noise(index+16)*900-370);
      const turn=crack*.18+spread*3.5;
      gl.uniformMatrix3fv(uniforms.Rotation,false,rotation((noise(index+5)-.5)*turn*2.4,(noise(index+14)-.5)*turn*2.5,(noise(index+36)-.5)*turn));
      gl.uniform3f(uniforms.Center,cx-data.width/2,data.height/2-cy,0);
      gl.uniform3f(uniforms.Travel,tx,ty,tz);
      gl.uniform1f(uniforms.Shrink,1-crack*.025);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      for (const [,size,offset,location] of mesh.attributes) gl.vertexAttribPointer(location,size,gl.FLOAT,false,36,offset);
      gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
  // Keep the static fallback after a context loss, preserving booking input.
  // Only scroll and resize repaint the meshes; idle animation stays in CSS.
  new ResizeObserver(()=>{if(ready) render();}).observe(host);
})();

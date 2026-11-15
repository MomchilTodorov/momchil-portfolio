const cameraEasing = .085;
const hoverEasing = .17;
const hoverDepth = 25;
const cameraTravel = 50;
const near = .0001;
const columns = 32;
const rows = 16;

const vertexSource = `
  attribute vec2 aUv;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform vec4 uPanel;
  uniform vec2 uScale;
  uniform vec2 uRoll;
  uniform float uVelocity;
  uniform vec3 uPull;
  uniform vec3 uRight;
  uniform vec3 uUp;
  uniform vec3 uBack;
  uniform vec3 uProjection;
  varying mediump vec2 vUv;
  varying mediump vec3 vWorld;

  void main() {
    vec2 plane = (aUv - .5) * uSize * vec2(1.0, -1.0);
    float arc = plane.x / uRadius;
    float x = sin(arc) * uRadius;
    float z = (cos(arc) - 1.0) * uRadius;
    z -= (x * x + plane.y * plane.y * .3) * uPanel.w * .0006;

    float edge = aUv.y * 2.0 - 1.0;
    float center = 1.0 - edge * edge;
    x += uVelocity * .06 * center;
    float y = plane.y * (1.0 - abs(uVelocity) * .008 * center);
    z += uPull.z * (1.0 - smoothstep(0.0, .9, distance(aUv, uPull.xy)));
    x *= uScale.x;
    y *= uScale.y;
    vec3 world = vec3(x * uRoll.x + z * uRoll.y, y, z * uRoll.x - x * uRoll.y) + uPanel.xyz;
    float depth = uProjection.z - dot(world, uBack);

    vUv = aUv;
    vWorld = world;
    gl_Position = vec4(dot(world, uRight) * uProjection.x, dot(world, uUp) * uProjection.y, 0.0, depth);
  }
`;

const fragmentSource = `
  precision mediump float;
  uniform sampler2D uMedia;
  uniform highp vec2 uSize;
  uniform vec2 uCrop;
  uniform vec3 uLight;
  uniform float uLightRadius;
  uniform float uChroma;
  uniform vec2 uColor;
  varying vec2 vUv;
  varying vec3 vWorld;

  vec4 sampleAt(vec2 uv) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
      return vec4(vec3(.1333), 1.0);
    }
    return texture2D(uMedia, uv);
  }

  void main() {
    vec2 uv = (vUv - .5) * uCrop + .5;
    vec4 color = sampleAt(uv);
    if (abs(uChroma) > .0001) {
      color.r = sampleAt(uv + vec2(uChroma, 0.0)).r;
      color.b = sampleAt(uv - vec2(uChroma, 0.0)).b;
    }

    float light = 1.0 - smoothstep(0.0, uLightRadius, distance(vWorld, uLight));
    const float cornerRadius = 4.5;
    vec2 corner = vec2(cornerRadius) - min(vUv, 1.0 - vUv) * uSize;
    float edgeDistance = length(max(vec2(0.0), corner)) + min(max(corner.x, corner.y), 0.0) - cornerRadius;
    float opacity = 1.0 - smoothstep(-1.0, 1.0, edgeDistance);
    gl_FragColor = vec4(color.rgb * uColor.x + vec3(light * .75), color.a * uColor.y * opacity);
  }
`;

function createMesh(gl) {
  const vertices = [];
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      vertices.push(column / columns, row / rows);
      if (row === rows || column === columns) continue;
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const vertex = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return {vertex, index, count: indices.length};
}

function createProgram(gl) {
  const program = gl.createProgram();
  const shaders = [vertexSource, fragmentSource].map((source, index) => {
    const shader = gl.createShader(index === 0 ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    return shader;
  });
  gl.linkProgram(program);
  for (const shader of shaders) gl.deleteShader(shader);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function nearestPanel(view, panels, mouse) {
  if (!mouse) return null;
  const {camera, right, up, back, width, height, distance, panelWidth, panelHeight} = view;
  const x = mouse.x * width / (2 * distance);
  const y = -mouse.y * height / (2 * distance);
  const ray = right.map((axis, index) => x * axis + y * up[index] - back[index]);
  let nearest = null;
  for (const panel of panels) {
    if (panel.alpha <= near) continue;
    const normal = [panel.sin, 0, panel.cos];
    const facing = dot(normal, ray);
    if (facing >= -near) continue;
    const origin = [panel.x - camera[0], -camera[1], panel.z - distance];
    const depth = dot(normal, origin) / facing;
    if (depth <= 0 || depth >= (nearest?.depth ?? Infinity)) continue;
    const planeX = camera[0] + depth * ray[0] - panel.x;
    const planeY = camera[1] + depth * ray[1];
    const planeZ = distance + depth * ray[2] - panel.z;
    const u = .5 + (planeX * panel.cos - planeZ * panel.sin) / (panelWidth * panel.scaleX);
    const v = .5 - planeY / (panelHeight * panel.scaleY);
    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) nearest = {index: panel.index, u, v, depth};
  }
  return nearest;
}

export function createGalleryProjection(canvas, slides) {
  if (!window.WebGLRenderingContext) return null;
  let gl;
  try {
    gl = canvas.getContext('webgl', {alpha: true, antialias: true, depth: false});
  } catch {
    return null;
  }
  if (!gl) return null;
  const program = createProgram(gl);
  if (!program) return null;
  gl.useProgram(program);
  const mesh = createMesh(gl);
  const uv = gl.getAttribLocation(program, 'aUv');
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const uniform = Object.fromEntries([
    'Size', 'Radius', 'Panel', 'Scale', 'Roll', 'Velocity', 'Pull', 'Right', 'Up', 'Back',
    'Projection', 'Crop', 'Light', 'LightRadius', 'Chroma', 'Color',
  ].map(name => [name, gl.getUniformLocation(program, 'u' + name)]));
  const surfaces = slides.map((slide, index) => ({
    slide, index, media: null, time: null, texture: null, u: .5, v: .5, pull: 0, scale: 1, curve: 0,
  }));
  let cameraX = 0;
  let cameraY = 0;
  let hovered = null;
  let active = false;
  let view;
  let panels = [];
  let contextLost = false;

  function showProjection(show) {
    if (active === show) return;
    active = show;
    canvas.parentElement.toggleAttribute('data-gallery-projected', show);
  }

  function loseContext(event) {
    event.preventDefault();
    contextLost = true;
    showProjection(false);
    canvas.parentElement.removeAttribute('data-gallery-hover');
  }

  canvas.addEventListener('webglcontextlost', loseContext);

  function updateMedia(surface) {
    const video = surface.slide.querySelector('video');
    const playing = video?.readyState >= 2 && !video.hidden;
    const media = playing ? video : surface.slide.querySelector('.project-cover img');
    const width = playing ? video.videoWidth : media?.naturalWidth;
    const height = playing ? video.videoHeight : media?.naturalHeight;
    if (!width || !height) return null;
    const time = playing ? video.currentTime : media.currentSrc;
    if (!surface.texture) {
      surface.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, surface.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, surface.texture);
    }
    if (surface.media !== media || surface.time !== time) {
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
      } catch {
        return null;
      }
      surface.media = media;
      surface.time = time;
    }
    return {ratio: width / height, playing};
  }

  return {
    frame({width, height, pointer, velocity, entrance, offset}) {
      if (contextLost || !width || !height) return false;
      const compact = width < 1024;
      const panelWidth = Math.min(1280, width * (compact ? .8 : .58));
      const panelHeight = panelWidth * .5625;
      const spacing = panelWidth + (compact ? 25 : 50);
      // Keep the measured carousel curvature when the portfolio has fewer projects.
      const arcStep = Math.PI / Math.max(surfaces.length, 6);
      const radius = spacing / arcStep;
      const distance = height / (2 * Math.tan(Math.PI / 8));
      cameraX += ((pointer?.x ?? 0) * cameraTravel - cameraX) * cameraEasing;
      cameraY += (-(pointer?.y ?? 0) * cameraTravel - cameraY) * cameraEasing;

      const camera = [cameraX, cameraY, distance];
      const length = Math.hypot(...camera);
      const back = camera.map(axis => axis / length);
      const horizontal = Math.hypot(cameraX, distance);
      const right = [distance / horizontal, 0, -cameraX / horizontal];
      const up = cross(back, right);
      view = {camera, right, up, back, width, height, distance, panelWidth, panelHeight};

      const speed = clamp(-velocity, -70, 70);
      const stretch = Math.min(Math.abs(speed) * .0016, .045);
      const introScale = .75 + entrance * .25;
      panels = surfaces.map(surface => {
        const steps = offset(surface.index);
        const angle = steps * arcStep;
        const depth = Math.min(1, Math.abs(angle) / (Math.PI / 2));
        surface.scale += (1 - depth * .35 * entrance - surface.scale) * .15;
        surface.curve += (depth * .4 * entrance - surface.curve) * .15;
        const yaw = angle * entrance;
        return {
          surface, index: surface.index,
          x: steps * spacing * (1 - entrance) + Math.sin(angle) * radius * entrance,
          z: (Math.cos(angle) - 1) * radius * entrance,
          alpha: clamp((1 - depth) / .15, 0, 1) * entrance,
          cos: Math.cos(yaw), sin: Math.sin(yaw),
          scaleX: surface.scale * introScale * (1 + stretch),
          scaleY: surface.scale * introScale * (1 - stretch * .6),
        };
      });

      hovered = nearestPanel(view, panels, pointer?.hover ? pointer : null);
      const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniform.Size, panelWidth, panelHeight);
      gl.uniform1f(uniform.Radius, radius);
      gl.uniform3fv(uniform.Right, right);
      gl.uniform3fv(uniform.Up, up);
      gl.uniform3fv(uniform.Back, back);
      gl.uniform3f(uniform.Projection, 2 * distance / width, 2 * distance / height, length);
      gl.uniform3f(uniform.Light, -cameraX / cameraTravel * panelWidth * .0808,
        -cameraY / cameraTravel * panelWidth * .0808, panelWidth * .5853);
      gl.uniform1f(uniform.LightRadius, panelWidth * .8621);
      gl.uniform1f(uniform.Velocity, speed);
      gl.uniform1f(uniform.Chroma, clamp(speed * .0022, -.018, .018));

      let drew = false;
      let animatingVideo = false;
      let moving = false;
      for (const panel of panels.sort((a, b) => a.z - b.z)) {
        const {surface, index, alpha, cos, sin, scaleX, scaleY} = panel;
        const hit = hovered?.index === index ? hovered : null;
        const target = hit ? hoverDepth : 0;
        surface.pull += (target - surface.pull) * hoverEasing;
        if (Math.abs(target - surface.pull) < .05) surface.pull = target;
        if (hit) {
          surface.u += (hit.u - surface.u) * hoverEasing;
          surface.v += (hit.v - surface.v) * hoverEasing;
        }
        moving ||= surface.pull !== target || Boolean(hit && Math.hypot(hit.u - surface.u, hit.v - surface.v) > .001);

        const visible = alpha > near && Math.abs(panel.x) < (width + panelWidth) * .8;
        const source = visible && updateMedia(surface);
        surface.slide.toggleAttribute('data-gallery-drawn', Boolean(source));
        if (!source) continue;

        const aspect = (panelWidth / panelHeight) / source.ratio;
        const contain = surface.slide.getAttribute('href') === '/work/ptm/';
        const cropX = contain ? Math.max(1, aspect) : Math.min(1, aspect);
        const cropY = contain ? Math.max(1, 1 / aspect) : Math.min(1, 1 / aspect);
        gl.uniform4f(uniform.Panel, panel.x, 0, panel.z, surface.curve);
        gl.uniform2f(uniform.Scale, scaleX, scaleY);
        gl.uniform2f(uniform.Roll, cos, sin);
        gl.uniform3f(uniform.Pull, surface.u, surface.v, surface.pull);
        gl.uniform2f(uniform.Crop, cropX, cropY);
        gl.uniform2f(uniform.Color, .55 + .45 * surface.scale, alpha);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
        drew = true;
        animatingVideo ||= source.playing && !surface.media.paused;
      }
      showProjection(drew);
      canvas.parentElement.toggleAttribute('data-gallery-hover',
        hovered !== null && surfaces[hovered.index].slide.hasAttribute('data-gallery-drawn'));
      return animatingVideo || moving || Math.abs((pointer?.x ?? 0) * cameraTravel - cameraX) > .02
        || Math.abs(-(pointer?.y ?? 0) * cameraTravel - cameraY) > .02;
    },
    pick(x, y) {
      return active && view ? nearestPanel(view, panels, {x, y})?.index ?? -1 : null;
    },
    hide() {
      showProjection(false);
      canvas.parentElement.removeAttribute('data-gallery-hover');
    },
    dispose() {
      this.hide();
      canvas.removeEventListener('webglcontextlost', loseContext);
      for (const {slide, texture} of surfaces) {
        slide.removeAttribute('data-gallery-drawn');
        if (texture) gl.deleteTexture(texture);
      }
      gl.deleteBuffer(mesh.vertex);
      gl.deleteBuffer(mesh.index);
      gl.deleteProgram(program);
    },
  };
}

const vertexShader = `
  attribute vec2 aUv;
  uniform vec4 uPanel;
  uniform vec2 uViewport;
  uniform float uBend;
  uniform float uRadius;
  uniform float uCameraDistance;
  uniform float uScale;
  varying mediump vec2 vUv;
  varying mediump float vWorldY;

  void main() {
    vec2 position = uPanel.xy + aUv * uPanel.zw - uViewport * .5;
    float worldY = position.y / uScale;
    float depth = uRadius * .85 * (1.0 - cos(worldY / uRadius)) * uBend;
    float perspective = 1.0 - depth / uCameraDistance;
    gl_Position = vec4(position * vec2(2.0, -2.0) / uViewport, 0.0, perspective);
    vUv = aUv;
    vWorldY = worldY;
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform sampler2D uMedia;
  uniform vec2 uCrop;
  uniform vec2 uPanelSize;
  varying mediump vec2 vUv;
  varying mediump float vWorldY;

  void main() {
    vec2 corner = vec2(4.5) - min(vUv, 1.0 - vUv) * uPanelSize;
    float edge = length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0);
    float opacity = (1.0 - smoothstep(3.5, 5.5, edge))
      * (1.0 - smoothstep(600.0, 650.0, abs(vWorldY)));
    vec4 color = texture2D(uMedia, (vUv - .5) * uCrop + .5);
    gl_FragColor = vec4(color.rgb, color.a * opacity);
  }
`;

// The reference uses a 45-degree camera and a case plane slightly in front of the carousel.
export function caseCamera(width, height) {
  const compact = width < 1024;
  const slideWidth = Math.min(1280, width * (compact ? .8 : .58));
  const carouselDepth = 6 * (slideWidth + (compact ? 25 : 50)) / Math.PI;
  const distance = height / (2 * Math.tan(Math.PI / 8));
  const planeDistance = Math.max(distance * .1, distance - carouselDepth * .1);
  return {distance: planeDistance, scale: distance / planeDistance};
}

export function createCaseMediaProjection(canvas) {
  let gl;
  try {
    gl = canvas.getContext('webgl');
  } catch {
    return null;
  }
  if (!gl) return null;

  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);

  // Each row uses the same viewport-relative projection, even across panel gaps.
  const buffer = gl.createBuffer();
  const uv = gl.getAttribLocation(program, 'aUv');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);

  const viewport = gl.getUniformLocation(program, 'uViewport');
  const bend = gl.getUniformLocation(program, 'uBend');
  const radius = gl.getUniformLocation(program, 'uRadius');
  const cameraDistance = gl.getUniformLocation(program, 'uCameraDistance');
  const scale = gl.getUniformLocation(program, 'uScale');
  const panel = gl.getUniformLocation(program, 'uPanel');
  const panelSize = gl.getUniformLocation(program, 'uPanelSize');
  const crop = gl.getUniformLocation(program, 'uCrop');
  const textures = new Map();
  let rows = 0;
  let worldScale = 1;
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  function draw(media, rect, title, offset) {
    const width = media.videoWidth || media.naturalWidth;
    const height = media.videoHeight || media.naturalHeight;
    if (!width || !height || !rect.width || !rect.height) return false;
    const version = media.videoWidth ? media.currentTime : media.currentSrc;
    const ratio = rect.width / rect.height / (width / height);

    let entry = textures.get(media);
    if (!entry) {
      const texture = gl.createTexture();
      if (!texture) return false;
      entry = {texture, version: null};
      textures.set(media, entry);
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    }

    if (entry.version !== version) {
      try {
        const source = title ? drawCover(media, rect, title, width, height, ratio) : media;
        if (!source) return false;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        entry.version = version;
      } catch {
        return false;
      }
    }

    gl.uniform4f(panel, rect.left, rect.top + offset, rect.width, rect.height);
    gl.uniform2f(panelSize, rect.width / worldScale, rect.height / worldScale);
    gl.uniform2f(crop, title ? 1 : Math.min(ratio, 1), title ? 1 : Math.min(1 / ratio, 1));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, (rows + 1) * 2);
    return true;
  }

  return {
    begin(width, height, amount, camera) {
      const subdivisions = width < 1024 ? 12 : 24;
      if (subdivisions !== rows) {
        rows = subdivisions;
        const vertices = new Float32Array((rows + 1) * 4);
        for (let row = 0; row <= rows; row++) {
          vertices.set([0, row / rows, 1, row / rows], row * 4);
        }
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      }

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const backingWidth = Math.round(width * pixelRatio);
      const backingHeight = Math.round(height * pixelRatio);
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
      gl.viewport(0, 0, backingWidth, backingHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(viewport, width, height);
      gl.uniform1f(bend, amount);
      gl.uniform1f(radius, width < 640 ? 600 : 1800);
      gl.uniform1f(cameraDistance, camera.distance);
      gl.uniform1f(scale, camera.scale);
      worldScale = camera.scale;
    },
    draw,
    clear() {
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const {texture} of textures.values()) gl.deleteTexture(texture);
      textures.clear();
    },
    dispose() {
      this.clear();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

// Brand covers use an HTML title over the image. Keep both on the same surface.
function drawCover(media, rect, title, width, height, ratio) {
  const cover = document.createElement('canvas');
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  cover.width = Math.round(rect.width * scale);
  cover.height = Math.round(rect.height * scale);
  const context = cover.getContext('2d');
  if (!context) return null;
  context.scale(cover.width / rect.width, cover.height / rect.height);

  const cropWidth = width * Math.min(ratio, 1);
  const cropHeight = height * Math.min(1 / ratio, 1);
  context.drawImage(media, (width - cropWidth) / 2, (height - cropHeight) / 2,
    cropWidth, cropHeight, 0, 0, rect.width, rect.height);

  const gradient = context.createLinearGradient(0, 0, rect.width * .88, 0);
  gradient.addColorStop(0, '#0007');
  gradient.addColorStop(1, '#0000');
  context.fillStyle = gradient;
  context.fillRect(0, 0, rect.width, rect.height);
  const style = getComputedStyle(title);
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.letterSpacing = style.letterSpacing;
  context.fillStyle = style.color;
  context.textBaseline = 'middle';
  const textNode = title.firstChild;
  const range = document.createRange();
  const lines = new Map();
  for (const word of textNode.textContent.matchAll(/\S+/g)) {
    range.setStart(textNode, word.index);
    range.setEnd(textNode, word.index + word[0].length);
    const bounds = range.getBoundingClientRect();
    const line = lines.get(bounds.top);
    if (line) line.text += ' ' + word[0];
    else lines.set(bounds.top, {text: word[0], left: bounds.left, middle: bounds.top + bounds.height / 2});
  }
  for (const line of lines.values()) {
    context.fillText(line.text, line.left - rect.left, line.middle - rect.top);
  }
  return cover;
}

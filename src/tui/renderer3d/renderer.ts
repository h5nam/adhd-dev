import { Vector2, Vector3, Vector4, Matrix44 } from './math.js';

export interface Polygon {
  vertices: [Vector3, Vector3, Vector3];
}

export interface RenderObject {
  mesh: Polygon[];
  position: Vector3;
  rotation: Vector3; // euler angles in radians
  scale: Vector3;
}

export class ASCII3DRenderer {
  private width: number;
  private height: number;
  private frameBuffer: string[][];
  private depthBuffer: number[][];
  private shade = ' ·:;+x%#@█';

  // Camera at fixed position looking at origin
  private cameraEye = new Vector3(0, 0, -4);
  private cameraLook = new Vector3(0, 0, 0);

  // Light direction (normalized, from camera direction)
  private lightDir = new Vector3(0, 0, 1).normalize();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.frameBuffer = [];
    this.depthBuffer = [];
    this.clearBuffers();
  }

  private clearBuffers(): void {
    this.frameBuffer = [];
    this.depthBuffer = [];
    for (let y = 0; y < this.height; y++) {
      this.frameBuffer.push(new Array<string>(this.width).fill(' '));
      this.depthBuffer.push(new Array<number>(this.width).fill(Infinity));
    }
  }

  render(objects: RenderObject[]): string[] {
    this.clearBuffers();

    for (const obj of objects) {
      for (const poly of obj.mesh) {
        const [p0, p1, p2] = poly.vertices;

        // World transform
        const w0 = this.worldTransform(new Vector4(p0.x, p0.y, p0.z, 1), obj);
        const w1 = this.worldTransform(new Vector4(p1.x, p1.y, p1.z, 1), obj);
        const w2 = this.worldTransform(new Vector4(p2.x, p2.y, p2.z, 1), obj);

        // Calculate lighting in world space (before view/projection)
        const brightness = this.calculateLight(w0, w1, w2);

        // Skip back faces (brightness < 0 means facing away)
        if (brightness < 0) continue;

        // View transform
        const v0 = this.viewTransform(w0);
        const v1 = this.viewTransform(w1);
        const v2 = this.viewTransform(w2);

        // Projection transform
        const p0p = this.projectionTransform(v0);
        const p1p = this.projectionTransform(v1);
        const p2p = this.projectionTransform(v2);

        // Rasterize
        this.rasterize(p0p, p1p, p2p, brightness);
      }
    }

    return this.frameBuffer.map(row => row.join(''));
  }

  private worldTransform(v: Vector4, obj: RenderObject): Vector4 {
    const scaleM = Matrix44.scale(obj.scale);
    const rotX = Matrix44.rotateX(obj.rotation.x);
    const rotY = Matrix44.rotateY(obj.rotation.y);
    const rotZ = Matrix44.rotateZ(obj.rotation.z);
    const transM = Matrix44.translate(obj.position);

    // TRS: translate * rotZ * rotY * rotX * scale
    const worldM = transM
      .multiply(rotZ)
      .multiply(rotY)
      .multiply(rotX)
      .multiply(scaleM);

    return v.transform(worldM);
  }

  private viewTransform(v: Vector4): Vector4 {
    // Build view matrix: look from cameraEye toward cameraLook
    const forward = new Vector3(
      this.cameraLook.x - this.cameraEye.x,
      this.cameraLook.y - this.cameraEye.y,
      this.cameraLook.z - this.cameraEye.z,
    ).normalize();

    const worldUp = new Vector3(0, 1, 0);
    const right = forward.cross(worldUp).normalize();
    const up = right.cross(forward).normalize();

    // View matrix (row-major): [right | up | -forward | translation]
    const tx = -right.dot(this.cameraEye);
    const ty = -up.dot(this.cameraEye);
    const tz = forward.dot(this.cameraEye);

    const viewM = new Matrix44(
      right.x,    right.y,    right.z,    tx,
      up.x,       up.y,       up.z,       ty,
      -forward.x, -forward.y, -forward.z, tz,
      0,          0,          0,          1,
    );

    return v.transform(viewM);
  }

  private projectionTransform(v: Vector4): Vector4 {
    const fov = 70 * (Math.PI / 180);
    const aspect = this.width / (this.height * 2); // *2 because chars are ~2x taller
    const near = 0.1;
    const far = 100;

    const tanHalfFov = Math.tan(fov / 2);
    const f = 1 / tanHalfFov;

    // Perspective projection matrix
    const projM = new Matrix44(
      f / aspect, 0,  0,                               0,
      0,          f,  0,                               0,
      0,          0,  (far + near) / (near - far),     (2 * far * near) / (near - far),
      0,          0, -1,                               0,
    );

    const projected = v.transform(projM);

    // Perspective divide
    if (projected.w !== 0) {
      return new Vector4(
        projected.x / projected.w,
        projected.y / projected.w,
        projected.z / projected.w,
        projected.w,
      );
    }
    return projected;
  }

  private calculateLight(v1: Vector4, v2: Vector4, v3: Vector4): number {
    // Compute face normal from world-space positions
    const edge1 = new Vector3(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const edge2 = new Vector3(v3.x - v1.x, v3.y - v1.y, v3.z - v1.z);
    const normal = edge1.cross(edge2).normalize();

    return normal.dot(this.lightDir);
  }

  private rasterize(v1: Vector4, v2: Vector4, v3: Vector4, brightness: number): void {
    // Map NDC [-1,1] to screen coordinates
    const toScreen = (v: Vector4): { x: number; y: number; z: number } => ({
      x: Math.floor(((v.x + 1) / 2) * (this.width - 1)),
      y: Math.floor(((-v.y + 1) / 2) * (this.height - 1)),
      z: v.z,
    });

    const s1 = toScreen(v1);
    const s2 = toScreen(v2);
    const s3 = toScreen(v3);

    // Bounding box
    const minX = Math.max(0, Math.min(s1.x, s2.x, s3.x));
    const maxX = Math.min(this.width - 1, Math.max(s1.x, s2.x, s3.x));
    const minY = Math.max(0, Math.min(s1.y, s2.y, s3.y));
    const maxY = Math.min(this.height - 1, Math.max(s1.y, s2.y, s3.y));

    // Shade character from brightness [0..1]
    const shadeIdx = Math.floor(Math.max(0, Math.min(brightness, 1)) * (this.shade.length - 1));
    const shadeChar = this.shade[shadeIdx];

    const p1 = new Vector2(s1.x, s1.y);
    const p2 = new Vector2(s2.x, s2.y);
    const p3 = new Vector2(s3.x, s3.y);

    // Average depth for depth buffer
    const avgZ = (s1.z + s2.z + s3.z) / 3;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const p = new Vector2(x, y);
        if (this.isPointInTriangle(p, p1, p2, p3)) {
          if (avgZ < this.depthBuffer[y][x]) {
            this.depthBuffer[y][x] = avgZ;
            this.frameBuffer[y][x] = shadeChar;
          }
        }
      }
    }
  }

  private isPointInTriangle(p: Vector2, p1: Vector2, p2: Vector2, p3: Vector2): boolean {
    // Barycentric coordinates using cross products
    const sign = (pa: Vector2, pb: Vector2, pc: Vector2): number =>
      (pa.x - pc.x) * (pb.y - pc.y) - (pb.x - pc.x) * (pa.y - pc.y);

    const d1 = sign(p, p1, p2);
    const d2 = sign(p, p2, p3);
    const d3 = sign(p, p3, p1);

    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNeg && hasPos);
  }
}

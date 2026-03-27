export class Vector3 {
  constructor(public x: number, public y: number, public z: number) {}

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiply(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return new Vector3(this.x / len, this.y / len, this.z / len);
  }
}

export class Vector4 {
  constructor(
    public x: number,
    public y: number,
    public z: number,
    public w: number,
  ) {}

  transform(m: Matrix44): Vector4 {
    const d = m.data;
    return new Vector4(
      d[0] * this.x + d[1] * this.y + d[2] * this.z + d[3] * this.w,
      d[4] * this.x + d[5] * this.y + d[6] * this.z + d[7] * this.w,
      d[8] * this.x + d[9] * this.y + d[10] * this.z + d[11] * this.w,
      d[12] * this.x + d[13] * this.y + d[14] * this.z + d[15] * this.w,
    );
  }
}

export class Vector2 {
  constructor(public x: number, public y: number) {}

  subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  multiply(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return new Vector2(this.x / len, this.y / len);
  }
}

export class Matrix44 {
  data: number[];

  constructor(...values: number[]) {
    if (values.length !== 16) {
      throw new Error('Matrix44 requires exactly 16 values');
    }
    this.data = values;
  }

  multiply(other: Matrix44): Matrix44 {
    const a = this.data;
    const b = other.data;
    const result = new Array<number>(16);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[row * 4 + k] * b[k * 4 + col];
        }
        result[row * 4 + col] = sum;
      }
    }
    return new Matrix44(...result);
  }

  static identity(): Matrix44 {
    return new Matrix44(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
  }

  static rotateX(angle: number): Matrix44 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix44(
      1, 0,  0, 0,
      0, c, -s, 0,
      0, s,  c, 0,
      0, 0,  0, 1,
    );
  }

  static rotateY(angle: number): Matrix44 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix44(
       c, 0, s, 0,
       0, 1, 0, 0,
      -s, 0, c, 0,
       0, 0, 0, 1,
    );
  }

  static rotateZ(angle: number): Matrix44 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix44(
      c, -s, 0, 0,
      s,  c, 0, 0,
      0,  0, 1, 0,
      0,  0, 0, 1,
    );
  }

  static scale(v: Vector3): Matrix44 {
    return new Matrix44(
      v.x,   0,   0, 0,
        0, v.y,   0, 0,
        0,   0, v.z, 0,
        0,   0,   0, 1,
    );
  }

  static translate(v: Vector3): Matrix44 {
    return new Matrix44(
      1, 0, 0, v.x,
      0, 1, 0, v.y,
      0, 0, 1, v.z,
      0, 0, 0,   1,
    );
  }
}

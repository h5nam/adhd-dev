import { describe, it, expect } from 'vitest';
import { Vector3, Vector4, Matrix44 } from '../../src/tui/renderer3d/math.js';
import { ASCII3DRenderer } from '../../src/tui/renderer3d/renderer.js';
import { getCrawfishModel } from '../../src/tui/renderer3d/crawfish-models.js';
import type { Polygon } from '../../src/tui/renderer3d/renderer.js';

describe('Vector3', () => {
  it('cross product is correct', () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    const c = a.cross(b);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(0);
    expect(c.z).toBeCloseTo(1);
  });

  it('cross product: i x j = k, j x k = i, k x i = j', () => {
    const i = new Vector3(1, 0, 0);
    const j = new Vector3(0, 1, 0);
    const k = new Vector3(0, 0, 1);

    const ij = i.cross(j);
    expect(ij.x).toBeCloseTo(0);
    expect(ij.y).toBeCloseTo(0);
    expect(ij.z).toBeCloseTo(1);

    const jk = j.cross(k);
    expect(jk.x).toBeCloseTo(1);
    expect(jk.y).toBeCloseTo(0);
    expect(jk.z).toBeCloseTo(0);

    const ki = k.cross(i);
    expect(ki.x).toBeCloseTo(0);
    expect(ki.y).toBeCloseTo(1);
    expect(ki.z).toBeCloseTo(0);
  });

  it('normalize produces unit vector', () => {
    const v = new Vector3(3, 4, 0);
    const n = v.normalize();
    expect(n.length()).toBeCloseTo(1);
  });

  it('dot product is correct', () => {
    const a = new Vector3(1, 2, 3);
    const b = new Vector3(4, 5, 6);
    expect(a.dot(b)).toBe(32);
  });
});

describe('Matrix44', () => {
  it('identity * vector = same vector', () => {
    const m = Matrix44.identity();
    const v = new Vector4(1, 2, 3, 1);
    const result = v.transform(m);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
    expect(result.z).toBeCloseTo(3);
    expect(result.w).toBeCloseTo(1);
  });

  it('identity * identity = identity', () => {
    const i = Matrix44.identity();
    const result = i.multiply(i);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const expected = row === col ? 1 : 0;
        expect(result.data[row * 4 + col]).toBeCloseTo(expected);
      }
    }
  });

  it('rotateY(0) is effectively identity for a vector', () => {
    const m = Matrix44.rotateY(0);
    const v = new Vector4(1, 2, 3, 1);
    const result = v.transform(m);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
    expect(result.z).toBeCloseTo(3);
  });

  it('rotateY(PI/2) rotates correctly', () => {
    const m = Matrix44.rotateY(Math.PI / 2);
    const v = new Vector4(1, 0, 0, 1);
    const result = v.transform(m);
    // (1,0,0) rotated 90 degrees around Y becomes (0,0,-1)
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(-1);
  });

  it('translate moves a point', () => {
    const m = Matrix44.translate(new Vector3(1, 2, 3));
    const v = new Vector4(0, 0, 0, 1);
    const result = v.transform(m);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
    expect(result.z).toBeCloseTo(3);
  });

  it('scale scales a vector', () => {
    const m = Matrix44.scale(new Vector3(2, 3, 4));
    const v = new Vector4(1, 1, 1, 1);
    const result = v.transform(m);
    expect(result.x).toBeCloseTo(2);
    expect(result.y).toBeCloseTo(3);
    expect(result.z).toBeCloseTo(4);
  });
});

describe('ASCII3DRenderer', () => {
  it('renders non-empty output for a simple box', () => {
    const renderer = new ASCII3DRenderer(20, 10);
    const box: Polygon[] = [
      { vertices: [new Vector3(-0.5, -0.5, 0.5), new Vector3(0.5, -0.5, 0.5), new Vector3(0.5, 0.5, 0.5)] },
      { vertices: [new Vector3(-0.5, -0.5, 0.5), new Vector3(0.5, 0.5, 0.5), new Vector3(-0.5, 0.5, 0.5)] },
    ];
    const lines = renderer.render([{
      mesh: box,
      position: new Vector3(0, 0, 0),
      rotation: new Vector3(0, 0, 0),
      scale: new Vector3(1, 1, 1),
    }]);
    expect(lines).toHaveLength(10);
    // At least one line should have non-space characters
    const hasContent = lines.some(line => line.trim().length > 0);
    expect(hasContent).toBe(true);
  });

  it('returns correct number of rows', () => {
    const renderer = new ASCII3DRenderer(30, 15);
    const lines = renderer.render([]);
    expect(lines).toHaveLength(15);
  });

  it('each row has correct width', () => {
    const renderer = new ASCII3DRenderer(20, 8);
    const lines = renderer.render([]);
    for (const line of lines) {
      expect(line.length).toBe(20);
    }
  });
});

describe('getCrawfishModel', () => {
  it('returns polygons for level 1', () => {
    const model = getCrawfishModel(1);
    expect(model.length).toBeGreaterThan(0);
  });

  it('returns polygons for each level 1-5', () => {
    for (let level = 1; level <= 5; level++) {
      const model = getCrawfishModel(level);
      expect(model.length).toBeGreaterThan(0);
    }
  });

  it('polygon count increases with level', () => {
    const counts = [1, 2, 3, 4, 5].map(l => getCrawfishModel(l).length);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    }
  });

  it('each polygon has exactly 3 vertices', () => {
    for (let level = 1; level <= 5; level++) {
      const model = getCrawfishModel(level);
      for (const poly of model) {
        expect(poly.vertices).toHaveLength(3);
      }
    }
  });

  it('clamps level below 1 to level 1', () => {
    expect(getCrawfishModel(0).length).toBe(getCrawfishModel(1).length);
  });

  it('clamps level above 5 to level 5', () => {
    expect(getCrawfishModel(10).length).toBe(getCrawfishModel(5).length);
  });
});

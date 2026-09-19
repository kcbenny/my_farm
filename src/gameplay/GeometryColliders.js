import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _sphere = new THREE.Sphere();

/**
 * ConvexHullCollider wraps Three.js ConvexHull for exact geometry collision.
 * It builds a tight convex hull enclosing all geometry vertices in world space.
 */
export class ConvexHullCollider {
  constructor(object, options = {}) {
    this.type = 'convexHull';
    this.object = object;
    this.name = object?.name || 'ConvexCollider';
    this.convexHull = new ConvexHull();
    this.boundingBox = new THREE.Box3();
    this.boundingSphere = new THREE.Sphere();
    this.margin = options.margin || 0.0;

    this.rebuild();
  }

  /**
   * Rebuilds the convex hull from the underlying object's geometry vertices.
   */
  rebuild() {
    if (!this.object) return;
    this.object.updateMatrixWorld(true);

    const points = [];
    this.object.traverse((node) => {
      if (node.isMesh && node.geometry) {
        const positionAttr = node.geometry.attributes?.position;
        if (positionAttr) {
          const matrix = node.matrixWorld;
          for (let i = 0; i < positionAttr.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
            p.applyMatrix4(matrix);
            points.push(p);
          }
        }
      }
    });

    if (points.length < 4) {
      // Fallback: If not enough points, use bounding box corners
      this.boundingBox.setFromObject(this.object);
      this.boundingBox.getBoundingSphere(this.boundingSphere);
      const corners = [
        new THREE.Vector3(this.boundingBox.min.x, this.boundingBox.min.y, this.boundingBox.min.z),
        new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.min.y, this.boundingBox.min.z),
        new THREE.Vector3(this.boundingBox.min.x, this.boundingBox.max.y, this.boundingBox.min.z),
        new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.max.y, this.boundingBox.min.z),
        new THREE.Vector3(this.boundingBox.min.x, this.boundingBox.min.y, this.boundingBox.max.z),
        new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.min.y, this.boundingBox.max.z),
        new THREE.Vector3(this.boundingBox.min.x, this.boundingBox.max.y, this.boundingBox.max.z),
        new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.max.y, this.boundingBox.max.z),
      ];
      this.convexHull.setFromPoints(corners);
      return;
    }

    // Subsample points if geometry has excessive vertices for real-time physics performance
    let processedPoints = points;
    if (points.length > 500) {
      const step = Math.ceil(points.length / 300);
      processedPoints = [];
      for (let i = 0; i < points.length; i += step) {
        processedPoints.push(points[i]);
      }
    }

    this.convexHull.setFromPoints(processedPoints);
    this.boundingBox.setFromPoints(processedPoints);
    this.boundingBox.getBoundingSphere(this.boundingSphere);
  }

  /**
   * Tests whether a sphere (e.g. player boundary sphere) intersects with this convex hull.
   * Returns null if no collision, or collision data with penetration depth and normal.
   */
  collideSphere(sphereCenter, radius) {
    // Broadphase test via bounding sphere
    const distSq = sphereCenter.distanceToSquared(this.boundingSphere.center);
    const maxRadius = this.boundingSphere.radius + radius;
    if (distSq > maxRadius * maxRadius) {
      return null;
    }

    // Narrowphase: Test against all planar faces of the convex hull
    let maxDist = -Infinity;
    let mostPenetratingFace = null;

    const faces = this.convexHull.faces;
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const dist = face.distanceToPoint(sphereCenter);
      // If outside any face by more than radius, sphere does not intersect hull
      if (dist > radius) {
        return null;
      }
      if (dist > maxDist) {
        maxDist = dist;
        mostPenetratingFace = face;
      }
    }

    if (!mostPenetratingFace) return null;

    // maxDist < radius: collision occurs!
    const penetration = radius - maxDist;
    const normal = mostPenetratingFace.normal.clone();

    return {
      collided: true,
      penetration: Math.max(0, penetration),
      normal,
      face: mostPenetratingFace
    };
  }

  containsPoint(point) {
    return this.convexHull.containsPoint(point);
  }
}

/**
 * OBBCollider wraps Three.js OBB (Oriented Bounding Box) aligned with mesh transformations.
 * Eliminates axis-aligned dead space when models are rotated.
 */
export class OBBCollider {
  constructor(object, options = {}) {
    this.type = 'obb';
    this.object = object;
    this.name = object?.name || 'OBBCollider';
    this.obb = new OBB();
    this.boundingSphere = new THREE.Sphere();
    this.margin = options.margin || 0.0;

    this.rebuild();
  }

  /**
   * Builds the Oriented Bounding Box tightly aligned with object's rotation and scale.
   */
  rebuild() {
    if (!this.object) return;
    this.object.updateMatrixWorld(true);

    const invMatrix = this.object.matrixWorld.clone().invert();
    const localBox = new THREE.Box3();
    let hasGeometry = false;

    this.object.traverse((node) => {
      if (node.isMesh && node.geometry) {
        if (!node.geometry.boundingBox) {
          node.geometry.computeBoundingBox();
        }
        if (node.geometry.boundingBox) {
          const meshBox = node.geometry.boundingBox.clone();
          const nodeToParent = node.matrixWorld.clone().premultiply(invMatrix);
          meshBox.applyMatrix4(nodeToParent);
          localBox.union(meshBox);
          hasGeometry = true;
        }
      }
    });

    if (!hasGeometry) {
      localBox.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    }

    if (this.margin > 0) {
      localBox.expandByScalar(this.margin);
    }

    this.obb.fromBox3(localBox);
    this.obb.applyMatrix4(this.object.matrixWorld);

    // Compute bounding sphere enclosing the OBB
    this.obb.getSize(_v1);
    this.boundingSphere.set(this.obb.center.clone(), _v1.length() * 0.5);
  }

  /**
   * Sets OBB manually from center, halfSize, and optional rotation angle around Y axis.
   */
  setFromBox(center, size, rotationY = 0) {
    this.obb.center.copy(center);
    this.obb.halfSize.set(size.x * 0.5, size.y * 0.5, size.z * 0.5);
    this.obb.rotation.identity();
    if (rotationY !== 0) {
      const rotM4 = new THREE.Matrix4().makeRotationY(rotationY);
      const rotM3 = new THREE.Matrix3().setFromMatrix4(rotM4);
      this.obb.rotation.copy(rotM3);
    }
    this.obb.getSize(_v1);
    this.boundingSphere.set(this.obb.center.clone(), _v1.length() * 0.5);
  }

  /**
   * Tests whether a sphere intersects with this OBB and computes resolution vector.
   */
  collideSphere(sphereCenter, radius) {
    _sphere.set(sphereCenter, radius);
    if (!this.obb.intersectsSphere(_sphere)) {
      return null;
    }

    // Find closest point on OBB to sphere center
    this.obb.clampPoint(sphereCenter, _closest);
    const distSq = _closest.distanceToSquared(sphereCenter);

    if (distSq > radius * radius) {
      return null;
    }

    const dist = Math.sqrt(distSq);
    const penetration = radius - dist;

    if (dist > 0.0001) {
      const normal = _v2.subVectors(sphereCenter, _closest).normalize();
      return {
        collided: true,
        penetration,
        normal: normal.clone(),
        closestPoint: _closest.clone()
      };
    } else {
      // Sphere center is inside or exactly on the OBB surface
      // Find direction from OBB center
      const normal = _v2.subVectors(sphereCenter, this.obb.center).normalize();
      if (normal.lengthSq() < 0.0001) normal.set(0, 0, 1);
      return {
        collided: true,
        penetration: radius,
        normal: normal.clone(),
        closestPoint: _closest.clone()
      };
    }
  }

  containsPoint(point) {
    return this.obb.containsPoint(point);
  }
}

/**
 * BoundingSphereCollider aligned with mesh transformation.
 */
export class BoundingSphereCollider {
  constructor(center, radius) {
    this.type = 'sphere';
    this.sphere = new THREE.Sphere(center.clone(), radius);
  }

  collideSphere(sphereCenter, radius) {
    const totalRadius = this.sphere.radius + radius;
    const distSq = sphereCenter.distanceToSquared(this.sphere.center);
    if (distSq >= totalRadius * totalRadius) {
      return null;
    }

    const dist = Math.sqrt(distSq);
    const penetration = totalRadius - dist;
    const normal = new THREE.Vector3();

    if (dist > 0.0001) {
      normal.subVectors(sphereCenter, this.sphere.center).normalize();
    } else {
      normal.set(1, 0, 0);
    }

    return {
      collided: true,
      penetration,
      normal
    };
  }

  containsPoint(point) {
    return this.sphere.containsPoint(point);
  }
}

import * as THREE from 'three';

export function createRoundedPlane (width, height, radius) {
  let shape = new THREE.Shape();
  const left = -width / 2, top =  -height / 2;
  const right = width / 2, bottom = height / 2;

  shape.moveTo(left, top + radius);
  shape.lineTo(left, bottom - radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom - radius);
  shape.lineTo(right, top + radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top + radius);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0,
    bevelEnabled: false
  });

  const material = new THREE.MeshBasicMaterial({
    color: 'black',
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(geometry, material);
}

export function replaceChar (string, index, c) {
  return string.substring(0, index) + c + string.substring(index + 1);
}

export function isPrintable(c) {
  return /^[\x20-\x7E]$/gs.test(c);
}

export function splitText (text, index) {
  const before = text.substring(0, index);
  const after = text.substring(index);
  return [before, after];
}

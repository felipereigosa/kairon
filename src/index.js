import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { run } from './cube';
import { Editor } from './editor';

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(-6, 0, 4);
controls.target.set(-6, 0, 0);

const container = document.getElementById('container');
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);
renderer.setClearColor(0x87ceeb);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
scene.add(hemisphereLight);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({color: 0xff0000});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);

  controls.update();
}
animate();

const editor = new Editor();
editor.mesh.position.x = -6;
scene.add(editor.mesh);

document.addEventListener("keydown", function (event) {
  editor.onKeyDown(event);
})

module.hot.accept('./cube', function () {
  try {
    run(scene);
  }
  catch (e) {
    console.error(e);
  }
})

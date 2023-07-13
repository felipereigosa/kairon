import * as THREE from 'three';
import * as util from '../util.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Slider extends THREE.Group {
  constructor() {
    super();

    const loader = new GLTFLoader();
    loader.load("slider.glb", (gltf) => {
      for (let child of [...gltf.scene.children]) {
        this.add(child);
      }

      this.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });

      const collision = this.getObjectByName("collision");
      collision.interactive = true;
      collision.visible = false;

      this.knob = this.getObjectByName('knob');
      this.amount = this.getObjectByName('amount');
      this.knob.interactive = true;

      this.knob.grabbed = (hand) => {
        this.changing = hand;
      };

      this.knob.released = (hand) => {
        if (this.changing === hand) {
          this.changing = null;
        }
      }
    });

    this.tempPosition = new THREE.Vector3();
  }

  update () {
    if (this.changing) {
      const controller = avatar.controllers[this.changing];
      controller.getWorldPosition(this.tempPosition);
      this.worldToLocal(this.tempPosition);
      this.knob.position.set(util.within(this.tempPosition.x, -0.45, 0.45), 0, 0);

      const value = util.mapRange(this.knob.position.x, -0.45, 0.45, 0, 1);
      this.amount.scale.set(value * 2, 1, 1);

      if (this.onchange) {
        editor.handleOutput(util.getOutput(() => this.onchange(value)));
      }
    }
  }
}

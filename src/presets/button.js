import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as util from '../util'

export class Button extends THREE.Group {
  constructor() {
    super()

    const loader = new GLTFLoader()
    loader.load("button.glb", (gltf) => {
      for (let child of [...gltf.scene.children]) {
        this.add(child)
      }

      this.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
        }
      })

      const collision = this.getObjectByName("collision")
      collision.interactive = true
      collision.visible = false

      this.cap = this.getObjectByName('cap')
    })
  }

  update () {
    const leftController = avatar.controllers['left']
    const rightController = avatar.controllers['right']
    const position = new THREE.Vector3()

    leftController.getWorldPosition(position)
    this.worldToLocal(position)
    position.y -= 0.1

    let withinBounds = Math.abs(position.x) < 0.1 && Math.abs(position.z) < 0.1

    if (!withinBounds) {
      rightController.getWorldPosition(position)
      this.worldToLocal(position)
      position.y -= 0.1
      withinBounds = Math.abs(position.x) < 0.1 && Math.abs(position.z) < 0.1
    }

    const bottom = 0.01
    const top = 0.08
    let newY = top
    if (withinBounds) {
      newY = Math.max(bottom, Math.min(position.y, top))
    }
    this.cap.position.set(0, newY, 0)

    if (newY === bottom && !this.pressed) {
      if (this.onpress) {
        editor.handleOutput(util.getOutput(this.onpress))
      }
      this.pressed = true
    }
    else if (newY === top && this.pressed) {
      if (this.onrelease) {
        this.onrelease()
      }
      this.pressed = false
    }
  }
}

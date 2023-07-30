import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export class Cube extends THREE.Mesh {
  constructor() {
    super(new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({color: 'red'}))
    this.scale.setScalar(0.3)
    this.castShadow = true
    this.interactive = true
    scene.add(this)
  }

  createBody () {
    const s = this.scale.x * 0.5
    const shape = new CANNON.Box(new CANNON.Vec3(s, s, s))
    const body = new CANNON.Body({mass: 1})
    body.addShape(shape)
    body.position.copy(this.position)
    body.quaternion.copy(this.quaternion)
    this.body = body
    physics.addBody(body)
  }
}

export class Sphere extends THREE.Mesh {
  constructor() {
    super (new THREE.SphereGeometry(1, 32, 32),
           new THREE.MeshStandardMaterial({color: 'white'}))
    this.scale.setScalar(0.2)
    this.castShadow = true
    this.interactive = true
    scene.add(this)
  }

  createBody () {
    const shape = new CANNON.Sphere(this.scale.x)
    const body = new CANNON.Body({mass: 1})
    body.addShape(shape)
    body.position.copy(this.position)
    body.quaternion.copy(this.quaternion)
    this.body = body
    physics.addBody(body)
  }
}

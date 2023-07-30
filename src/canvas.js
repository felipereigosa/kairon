import * as THREE from 'three'
import * as util from './util'

export class Canvas extends THREE.Group {
  constructor () {
    super()
    this.width = 11.5
    this.height = 5
    const geometry = new THREE.PlaneGeometry(this.width, this.height)
    this.canvas = document.createElement('canvas')
    this.canvas.width = 200 * this.width
    this.canvas.height = 200 * this.height
    this.context = this.canvas.getContext('2d')
    this.texture = new THREE.Texture(this.canvas)
    const material = new THREE.MeshBasicMaterial({map: this.texture,
                                                  transparent: true})
    const plane = new THREE.Mesh(geometry, material)
    plane.renderOrder = 1
    this.add(plane)
    this.drawing = false
    this.erasing = false
    this.windowWidth = 800
  }

  draw (event) {
    this.context.lineCap = 'round'

    if (this.erasing) {
      this.context.globalCompositeOperation = 'destination-out'
      this.context.fillStyle = 'rgba(0,0,0,1)'
      this.context.lineWidth = 60
    } else {
      this.context.globalCompositeOperation = 'source-over'
      this.context.strokeStyle = 'white'
      this.context.lineWidth = 4 * event.pressure
    }

    const ratio = this.canvas.width / this.canvas.height
    const u = util.mapRange(event.x,
                            0, this.windowWidth,
                            0, this.canvas.width)
    const v = util.mapRange(event.y,
                            0, this.windowWidth / ratio,
                            0, this.canvas.height)

    this.context.lineTo(u, v)
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(u, v)

    this.texture.needsUpdate = true
  }

  clear () {
    this.context.globalCompositeOperation = 'destination-out'
    this.context.fillStyle = "rgba(0,0,0,1)"
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.texture.needsUpdate = true
  }

  onPointerDown(event) {
    if (event.button === 1) {
      this.erasing = true
      this.pointer.children[1].visible = true
      this.pointer.children[2].visible = false
    }
    else {
      this.drawing = true
      this.draw(event)
    }
  }

  onPointerMove(event) {
    const hw = this.width / 2
    const hh = this.height / 2
    const ratio = this.canvas.width / this.canvas.height
    this.pointer.position.x =
      util.mapRange(event.x,
                    0, this.windowWidth,
                    -hw, hw) + 1.1
    this.pointer.position.y =
      Math.max(-hh, util.mapRange(event.y,
                                  0, this.windowWidth / ratio,
                                  hh, -hh))
    if (this.drawing) {
      this.draw(event)
    }
  }

  onPointerUp(event) {
    if (event.button === 1) {
      this.erasing = false
      this.pointer.children[1].visible = false
      this.pointer.children[2].visible = true
    }
    else if (this.drawing) {
      this.drawing = null
      this.context.beginPath()
    }
  }

  onResize(event) {
    this.windowWidth = event.width
  }
}

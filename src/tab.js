import * as THREE from 'three'
import * as util from './util'
import { Canvas } from './canvas'

const textOffset = [-4.5, 2]

export class Tab extends THREE.Group {
  constructor () {
    super()
    this.text = ""
    this.index = 0
    this.offset = 0
    this.saved = true

    const geometry = new THREE.BufferGeometry()
    const material = new THREE.MeshBasicMaterial({color: 0xffffff})

    this.title = new THREE.Mesh(geometry, material)
    this.title.scale.set(0.15, 0.15, 0.15)
    this.title.position.set(textOffset[0] - 2.35, 0, 0.02)
    this.add(this.title)

    this.canvas = new Canvas()
    this.canvas.position.set(1.1, 0, 0.01)
    this.add(this.canvas)
  }

  computeTitle () {
    let text = this.text.trim()
    let title = ""

    const nextToken = (t, i, stop) => {
      const index = text.indexOf(stop)
      if (index === -1) {
        return t.slice(i).trim()
      }
      else {
        return t.slice(i, index).trim()
      }
    }

    if (util.isTerminal(text)) {
      title = "terminal"
    }
    else if (text.startsWith("//")) {
      title = text.split("\n")[0].slice(2).trim()
    }
    else if (text.startsWith("function")) {
      title = nextToken(text, 8, "(")
    }
    else if (text.startsWith("const")) {
      title = nextToken(text, 5, "=")
    }
    else {
      title = text.split("\n")[0]
    }

    title = (this.saved ? "" : "* ") + title

    if (title.length > 20) {
      title = title.slice(0, 17) + "..."
    }

    return title
  }

  clearCanvas () {
    this.canvas.clear()
  }

  update (i, font) {
    this.title.position.y = textOffset[1] - i * 0.35
    this.title.geometry.dispose()
    let title = this.computeTitle()
    const shapes = font.generateShapes(title, 0.8)
    this.title.geometry = new THREE.ShapeGeometry(shapes)
  }

  onPointerDown(event) {
    this.canvas.onPointerDown(event)
  }

  onPointerMove(event) {
    this.canvas.onPointerMove(event)
  }

  onPointerUp(event) {
    this.canvas.onPointerUp(event)
  }

  onResize(event) {
    this.canvas.onResize(event)
  }
}

import * as THREE from 'three'
import { textOffset } from './config'

export class Mark extends THREE.Group {
  constructor (parent) {
    super()
    this.parent = parent
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.167, 0.4),
                                 new THREE.MeshBasicMaterial({color: 0}))
    plane.material.clippingPlanes = this.parent.clippingPlanes

    this.start = plane.clone()
    this.add(this.start)
    this.middle = plane.clone()
    this.add(this.middle)
    this.end = plane.clone()
    this.add(this.end)
  }

  update (tab) {
    let p1 = tab.mark
    let p2 = tab.index
    this.visible = p1 !== -1
    if (p1 === -1) return
    if (p1 > p2) {
      [p1, p2] = [p2, p1]
    }

    let [startRow, startCol] = this.parent.getRowCol(p1)
    let [endRow, endCol] = this.parent.getRowCol(p2)

    startRow -= tab.offset
    endRow -= tab.offset

    this.start.visible = true
    this.middle.visible = true
    this.end.visible = true

    if (endRow === startRow) {
      this.middle.visible = false
      this.end.visible = false
      this.start.scale.x = endCol - startCol
    }
    else {
      this.start.scale.x = 68 - startCol
    }

    this.start.position.set(textOffset[0] +
                            this.start.scale.x * 0.167 * 0.5 +
                            0.167 * startCol,

                            textOffset[1] + 0.1 - 0.39 * startRow,
                            0.009)

    this.middle.scale.x = 68
    this.middle.scale.y = endRow - startRow - 1
    this.middle.position.set(textOffset[0] + 5.678,

                             textOffset[1] - 0.1 -
                             0.39 * (this.middle.scale.y / 2 - 1 + startRow + 1),

                             0.009)

    this.end.scale.x = endCol
    this.end.position.set(textOffset[0] + this.end.scale.x * 0.167 * 0.5,
                          textOffset[1] + 0.1 - 0.39 * endRow,
                          0.009)
  }
}

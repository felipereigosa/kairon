import {Vector3} from "three"

export class VelocityEstimator {
  constructor() {
    this.ringSize = 10
    this.positionRing = []

    for (let i = 0; i < this.ringSize; i++) {
      this.positionRing.push(new Vector3(0, 0, 0))
    }
    this.ringIndex = 0
  }

  recordPosition (position) {
    this.positionRing[this.ringIndex].copy(position)
    this.ringIndex = (this.ringIndex + 1) % this.ringSize
  }

  getVelocity () {
    let positionDiffs = []
    for (let i = 1; i <= this.ringSize - 1; i++) {
      let currentIndex = (this.ringIndex - i + this.ringSize) % this.ringSize
      let prevIndex = (currentIndex - 1 + this.ringSize) % this.ringSize
      let currentPosition = this.positionRing[currentIndex]
      let prevPosition = this.positionRing[prevIndex]
      positionDiffs.push([currentPosition.x - prevPosition.x,
                          currentPosition.y - prevPosition.y,
                          currentPosition.z - prevPosition.z])
    }
    return positionDiffs.reduce((sum, diff) => {
      return [sum[0] + diff[0],
              sum[1] + diff[1],
              sum[2] + diff[2]]
    }, [0, 0, 0])
      .map(diff => diff / (this.ringSize - 1))
  }
}

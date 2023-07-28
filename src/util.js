import * as THREE from 'three'

export function createRoundedPlane (width, height, radius) {
  let shape = new THREE.Shape()
  const left = -width / 2, top =  -height / 2
  const right = width / 2, bottom = height / 2

  shape.moveTo(left, top + radius)
  shape.lineTo(left, bottom - radius)
  shape.quadraticCurveTo(left, bottom, left + radius, bottom)
  shape.lineTo(right - radius, bottom)
  shape.quadraticCurveTo(right, bottom, right, bottom - radius)
  shape.lineTo(right, top + radius)
  shape.quadraticCurveTo(right, top, right - radius, top)
  shape.lineTo(left + radius, top)
  shape.quadraticCurveTo(left, top, left, top + radius)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.001,
    bevelEnabled: false
  })

  const material = new THREE.MeshBasicMaterial({
    color: 'black',
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  })

  return new THREE.Mesh(geometry, material)
}

export function replaceChar (string, index, c) {
  return string.substring(0, index) + c + string.substring(index + 1)
}

export function isPrintable(c) {
  return /^[\x20-\x7E]$/gs.test(c)
}

export function splitText (text, index) {
  const before = text.substring(0, index)
  const after = text.substring(index)
  return [before, after]
}

export const toRadians = THREE.MathUtils.degToRad

export function within (value, min, max) {
  if (value < min) {
    return min
  } else if (value > max) {
    return max
  } else {
    return value
  }
}

export function rotatePoint (point, pivot, angle) {
  const cos = Math.cos(degToRad(-angle))
  const sin = Math.sin(degToRad(-angle))
  const x = point.x - pivot.x
  const z = point.z - pivot.z
  point.x = x * cos - z * sin + pivot.x
  point.z = x * sin + z * cos + pivot.z
}

export function signedAngle(v1, v2, axis) {
  const v1p = v1.clone().projectOnPlane(axis)
  const v2p = v2.clone().projectOnPlane(axis)
  const cross = new THREE.Vector3()
  cross.crossVectors(v1p, v2p)
  let angle = v1p.angleTo(v2p)
  if (cross.dot(axis) < 0) {
    angle = -angle
  }
  return radToDeg(angle)
}

export function getOutput(func) {
  let logOutput = ''
  const originalLog = console.log
  const seen = new WeakSet()

  const replacer = (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    return value
  }

  console.log = function(message) {
    if (Array.isArray(message) ||
        (typeof message === 'object' && message !== null)) {
      logOutput += JSON.stringify(message, replacer) + '\n'
    } else {
      logOutput += message + '\n'
    }
  }
  func()
  console.log = originalLog
  return logOutput
}

export function clone(source) {
  const sourceLookup = new Map()
  const cloneLookup = new Map()
  const clone = source.clone()

  const parallelTraverse = (a, b, callback) => {
    callback(a, b)
    for (let i = 0; i < a.children.length; i++) {
      parallelTraverse(a.children[i], b.children[i], callback)
    }
  }

  parallelTraverse(source, clone, function (sourceNode, clonedNode) {
    sourceLookup.set(clonedNode, sourceNode)
    cloneLookup.set(sourceNode, clonedNode)
  })

  clone.traverse(function (node) {
    if (!node.isSkinnedMesh) return
    const clonedMesh = node
    const sourceMesh = sourceLookup.get(node)
    const sourceBones = sourceMesh.skeleton.bones

    clonedMesh.skeleton = sourceMesh.skeleton.clone()
    clonedMesh.bindMatrix.copy(sourceMesh.bindMatrix)
    clonedMesh.skeleton.bones = sourceBones.map(function (bone) {
      return cloneLookup.get(bone)
    })

    clonedMesh.bind(clonedMesh.skeleton, clonedMesh.bindMatrix)
  })

  return clone
}

export function print (...args) {
  console.log(args.join(" "))
}

export function mapRange (value, min1, max1, min2, max2) {
  return min2 + (max2 - min2) * (value - min1) / (max1 - min1)
}

export function isTerminal (text) {
  return text.split('\n').some(line => line.startsWith(">"))
}

export function selectKeys (obj, keys) {
  return keys.reduce((newObj, key) => {
    if (key in obj) {
      newObj[key] = obj[key]
    }
    return newObj
  }, {})
}

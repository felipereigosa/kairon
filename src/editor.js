import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader'
import * as esprima from 'esprima'
import { highlight } from './highlight'
import * as util from './util'
import { colors, textOffset } from './config'
import { Tab } from './tab'
import { Mark } from './mark'

export class Editor extends THREE.Group {
  constructor () {
    super()
    this.plane = util.createRoundedPlane(14, 5, 0.2)
    this.plane.renderOrder = 0
    this.currentTab = 0
    this.add(this.plane)

    this.cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.3),
                                 new THREE.MeshBasicMaterial({color: 0xffffff}))
    this.cursor.position.set(textOffset[0] + 0.08, textOffset[1] + 0.1, 0.01)
    this.add(this.cursor)

    this.selector = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.3),
                                   new THREE.MeshBasicMaterial({color: 0x101010}))
    this.selector.position.set(textOffset[0] - 1.4, 2.06 - 0.35, 0.01)
    this.add(this.selector)

    const divider = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
                                   new THREE.MeshBasicMaterial({color: 0xaaaaaa}))
    divider.position.set(textOffset[0] - 0.3, 0, 0.01)
    divider.scale.set(0.01, 4.5, 1)
    this.add(divider)

    this.clippingPlanes = [...Array(3)].map(() => new THREE.Plane())
    this.updateClippingPlanes()

    this.mark = new Mark(this)
    this.add(this.mark)

    this.pointer = new THREE.Group()
    this.pointer.position.z = 0.03
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32),
                               new THREE.MeshBasicMaterial({color: 'white'}))
    const square = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15),
                                  new THREE.MeshBasicMaterial({color: 'white'}))
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32),
                                new THREE.MeshBasicMaterial({color: 0,
                                                             transparent: true,
                                                             opacity: 0.3}))
    halo.renderOrder = 2
    this.pointer.add(halo)
    halo.position.z = -0.01
    this.pointer.add(square)
    square.visible = false
    this.pointer.add(dot)
    this.add(this.pointer)

    this.pointer.visible = false

    const fontLoader = new FontLoader()
    fontLoader.load('droid_sans_mono_regular.typeface.json', (font) => {
      const shapes = font.generateShapes("", 1)
      const geometry = new THREE.ShapeGeometry(shapes)
      const material = new THREE.MeshBasicMaterial()
      const template = new THREE.Mesh(geometry, material)
      template.scale.set(0.2, 0.2, 0.2)
      template.position.set(textOffset[0], textOffset[1], 0.02)

      for (let color of Object.keys(colors)) {
        const mesh = template.clone()
        mesh.name = color
        mesh.material = template.material.clone()
        mesh.material.clippingPlanes = this.clippingPlanes
        mesh.material.color.set(colors[color])
        this.add(mesh)
      }

      this.font = font

      fetch('/load-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
      }).then(response => response.text())
        .then(data => {
          this.tabs = []
          for (let tab of data.split("\n\n//@\n\n")) {
            this.newTab(tab, 0)
          }
          this.update()
        })
    })
  }

  newTab (text, index) {
    const tab = new Tab()
    tab.text = text
    tab.index = index
    tab.mark = -1
    tab.canvas.pointer = this.pointer
    this.add(tab)
    this.tabs.push(tab)
  }

  deleteTab (i) {
    this.remove(this.tabs[i])
    this.tabs.splice(i, 1)
    if (this.tabs.length === 0) {
      this.newTab("", 0)
    }
    if (this.currentTab >= this.tabs.length) {
      this.currentTab = this.tabs.length - 1
    }
  }

  getTotal (row) {
    const tab = this.tabs[this.currentTab]
    const lines = tab.text.split("\n")
    return lines.slice(0, row).reduce((acc, x) => acc + x.length + 1, 0)
  }

  getRowCol (i) {
    const tab = this.tabs[this.currentTab]
    const index = (i === undefined) ? tab.index : i
    const before = tab.text.substring(0, index)
    const lines = before.split("\n")
    const row = lines.length - 1
    const col = index - this.getTotal(row)
    return [row, col]
  }

  setRowCol (row, col) {
    const tab = this.tabs[this.currentTab]
    const lines = tab.text.split("\n")
    col = Math.min(lines[row].length, col)
    tab.index = this.getTotal(row) + col
  }

  updateClippingPlanes () {
    const [bottomPlane, topPlane, rightPlane] = this.clippingPlanes
    let position = new THREE.Vector3()
    this.getWorldPosition(position)
    let normal = new THREE.Vector3(0, 1, 0).applyEuler(this.rotation)
    bottomPlane.normal.copy(normal)
    bottomPlane.constant = -position.dot(bottomPlane.normal) + 0.48
    topPlane.normal.copy(normal)
    topPlane.normal.multiplyScalar(-1)
    topPlane.constant = -position.dot(topPlane.normal) + 0.45

    normal.set(-1, 0, 0).applyEuler(this.rotation)
    rightPlane.normal.copy(normal)
    rightPlane.constant = -position.dot(rightPlane.normal) + 1.37
  }

  update () {
    const tab = this.tabs[this.currentTab]
    const text = tab.text
    const result = highlight(text)
    const getY = () => textOffset[1] + 0.1 - 0.39 * (row - tab.offset)
    const [row, col] = this.getRowCol()

    while (getY() > 2.1) tab.offset -= 1
    while (getY() < -2.2) tab.offset += 1
    this.cursor.position.set(textOffset[0] + 0.08 + 0.167 * col, getY(), 0.01)

    result.black = text
    result.black = result.black.replace(/[\x20-\x7E]/gs, ' ')
    if (tab.index !== text.length) {
      result.black = util.replaceChar(result.black, tab.index, text[tab.index])
    }

    for (let color of Object.keys(result)) {
      const colorMesh = this.getObjectByName(color)
      colorMesh.geometry.dispose()
      let text = result[color]
      if (util.isPrintable(text[tab.index]) && color !== "black") {
        text = util.replaceChar(text, tab.index, ' ')
      }
      const shapes = this.font.generateShapes(text, 1)
      colorMesh.geometry = new THREE.ShapeGeometry(shapes)
      colorMesh.position.y= textOffset[1] + 0.39 * tab.offset
    }

    this.selector.position.y = 2.06 - 0.35 * this.currentTab

    for (let [i, tab] of this.tabs.entries()) {
      tab.update(i, this.font)
      tab.canvas.visible = i === this.currentTab
    }
    this.mark.update(tab)
  }

  insert (text) {
    const tab = this.tabs[this.currentTab]
    const [before, after] = util.splitText(tab.text, tab.index)
    this.tabs[this.currentTab].saved = false
    tab.text = before + text + after
    tab.index += text.length
  }

  moveCursor (x, y) {
    const tab = this.tabs[this.currentTab]
    if (x < 0) {
      tab.index = Math.max(0, tab.index + x)
    } else if (x > 0) {
      tab.index = Math.min(tab.index + x, tab.text.length)
    }
    else if (y < 0) {
      const [row, col] = this.getRowCol()
      if (row > 0) {
        this.setRowCol(row - 1, col)
      }
    }
    else if (y > 0) {
      const [row, col] = this.getRowCol()
      const lines = tab.text.split("\n")
      if (row < lines.length - 1) {
        this.setRowCol(row + 1, col)
      }
    }
  }

  erase (offset) {
    const tab = this.tabs[this.currentTab]
    const [before, after] = util.splitText(tab.text, tab.index)
    this.tabs[this.currentTab].saved = false
    if (offset < 0) {
      tab.text = before.substring(0, before.length + offset) + after
      tab.index = Math.max(0, tab.index + offset)
    } else {
      tab.text = before + after.substring(offset)
    }
  }

  getGlobals (code) {
    const ast = esprima.parseScript(code)
    const topLevelIdentifiers = []
    for (const statement of ast.body) {
      if (statement.type === 'FunctionDeclaration' ||
          statement.type === 'ClassDeclaration') {
        topLevelIdentifiers.push(statement.id.name)
      } else if (statement.type === 'VariableDeclaration') {
        for (const declaration of statement.declarations) {
          topLevelIdentifiers.push(declaration.id.name)
        }
      }
    }
    return topLevelIdentifiers
  }

  parseCommand (code) {
    const trimmed = code.trim()
    if (util.isTerminal(trimmed)) {
      const lines = trimmed.split("\n")
      const line = lines[lines.length - 1].slice(2)
      return `console.log((() => ${line}) ())`
    } else {
      return code
    }
  }

  execute () {
    try {
      const text = this.parseCommand(this.tabs[this.currentTab].text)
      const globals = this.getGlobals(text)
            .map(x => `window.${x} = ${x}`).join("\n")

      const code = `import * as THREE from 'three'
                    import * as CANNON from 'cannon-es'
                    import * as util from './util'
                    import { Button } from './presets/button'
                    import { Slider } from './presets/slider'
                    import { Cube, Sphere } from './presets/shapes'

                    export function run () {
                      try {
                        ${text}
                        ${globals}
                      } catch (error) {
                        console.log("ERROR: " + error)
                      }
                    }
                    // ${Date.now()}`

      fetch('/update-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: code
      })

      fetch('/save-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: this.tabs.map(tab => tab.text).join("\n\n//@\n\n")
      })
    }
    catch (error) {
      this.handleOutput(error + "\n")
    }
  }

  getTerminalTab () {
    let index = this.tabs.findIndex(tab => {
      return util.isTerminal(tab.text)
    })

    if (index === -1) {
      this.newTab("> ", 2)
      index = this.tabs.length - 1
    }

    return index
  }

  handleOutput (output) {
    if (output.length > 0) {
      console.log(output)
      if (output.length > 68) {
        output = output.slice(0, 65) + "..."
      }
      if (util.isTerminal(this.tabs[this.currentTab].text)) {
        this.tabs[this.currentTab].text += '\n' + output + '> '
        this.tabs[this.currentTab].index = this.tabs[this.currentTab].text.length
      }
      else {
        const outTabIndex = this.getTerminalTab()
        const tab = this.tabs[outTabIndex]
        const index = tab.text.lastIndexOf(">")
        const [before, after] = util.splitText(tab.text, index)

        if (output[output.length - 1] !== "\n") {
          output += "\n"
        }
        tab.text = before + output + after
        tab.index = tab.text.length
        this.tabs[outTabIndex].saved = false
      }
      this.update()
    }
  }

  nextTab () {
    this.currentTab = (this.currentTab + 1) % this.tabs.length
  }

  previousTab () {
    const len = this.tabs.length
    this.currentTab = (this.currentTab - 1 + len) % this.tabs.length
  }

  calculateIndentation (code) {
    let indent = 0
    let openBraces = 0
    let closeBraces = 0

    for (let i = 0; i < code.length; i++) {
      if (code[i] === "{") {
        openBraces++
      }
      else if (code[i] === "}") {
        closeBraces++
      }
    }

    if (openBraces > closeBraces) {
      indent = (openBraces - closeBraces) * 2
    }

    let indentString = ""
    for (let i = 0; i < indent; i++) {
      indentString += " "
    }

    return indentString
  }

  newLine () {
    const tab = this.tabs[this.currentTab]
    const [before, after] = util.splitText(tab.text, tab.index)
    const indent = this.calculateIndentation(before)
    tab.text = before + "\n" + indent + after
    tab.index += indent.length + 1
  }

  prevWordIndex (index) {
    const text = this.tabs[this.currentTab].text
    let r = /[a-zA-Z0-9_$]/g
    index -= 2
    while ((r.lastIndex = 0, !r.test(text[index])) ||
           (r.lastIndex = 0, r.test(text[index - 1]))) {
      index -= 1

      if (index < 0) {
        index = 0
        break
      }
    }
    return index
  }

  nextWordIndex (index) {
    const text = this.tabs[this.currentTab].text
    let r = /[a-zA-Z0-9_$]/g
    index += 1
    while ((r.lastIndex = 0, !r.test(text[index])) ||
           (r.lastIndex = 0, r.test(text[index + 1]))) {
      index += 1
      if (index >= text.length) {
        index = text.length - 1
        break
      }
    }
    return index + 1
  }

  visited () {
    const text = this.tabs[this.currentTab].text
    if (util.isTerminal(text) && text.trim().endsWith(">")) {
      this.tabs[this.currentTab].saved = true
      this.update()
    }
  }

  onKeyDown (event) {
    const tab = this.tabs[this.currentTab]

    if (event.altKey && event.shiftKey) {
      if (event.key === "<") {
        tab.index = 0
      }
      else if (event.key === ">") {
        tab.index = tab.text.length
      }
      else if (event.key === "P") {
        tab.offset = Math.max(0, tab.offset - 1)
        this.moveCursor(0, -1)
      }
      else if (event.key === "N") {
        const lines = tab.text.split("\n")
        tab.offset = Math.min(lines.length - 12, tab.offset + 1)
        this.moveCursor(0, 1)
      }
    }
    else if (event.ctrlKey && event.altKey) {
      if (event.key === " ") {
        if (tab.mark === -1) {
          tab.mark = tab.index
        }
        tab.mark = this.nextWordIndex(tab.mark)
      }
    }
    else if (event.ctrlKey && event.shiftKey) {
      if (event.key === "J") {
        this.execute()
        this.tabs[this.currentTab].saved = true
      }
      else if (event.key === "P") {
        this.insert("console.log()")
        this.moveCursor(-2, 0)
      }
      else if (event.key === "Tab") {
        this.previousTab()
        this.visited()
      }
      else if (event.key === "W") {
        this.deleteTab(this.currentTab)
      }
    }
    else if (event.altKey) {
      if (event.key === "f") {
        tab.index = this.nextWordIndex(tab.index)
      }
      else if (event.key === "b") {
        tab.index = this.prevWordIndex(tab.index)
      }
      else if (event.key === "d") {
        const index = this.nextWordIndex(tab.index)
        this.erase(index - tab.index)
      }
      else if (event.key === "Backspace") {
        const index = this.prevWordIndex(tab.index)
        this.erase(index - tab.index)
      }
      else if (event.key === "w") {
        this.clipboard = tab.text.substring(tab.index, tab.mark)
        tab.mark = -1
      }
    }
    else if (event.ctrlKey) {
      if (event.key.match(/^[0-9]$/)) {
        const index = parseInt(event.key)
        if (index < this.tabs.length) {
          this.currentTab = index
        }
        this.visited()
      }
      else if (event.key === "Tab") {
        this.nextTab()
        this.visited()
      }
      else if (event.key === "t") {
        this.newTab("", 0)
        this.currentTab = this.tabs.length - 1
      }
      else if (event.key === "j") {
        this.newLine()
      }
      else if (event.key === "k") {
        let index = tab.text.indexOf("\n", tab.index)
        if (index === -1) {
          index = tab.text.length
        }
        let l = tab.text.substring(tab.index, index).length
        if (l === 0) l = 1
        this.erase(l)
      }
      else if (event.key === "d") {
        this.erase(1)
      }
      else if (event.key === "f") {
        this.moveCursor(1, 0)
      }
      else if (event.key === "b") {
        this.moveCursor(-1, 0)
      }
      else if (event.key === "n") {
        this.moveCursor(0, 1)
      }
      else if (event.key === "p") {
        this.moveCursor(0, -1)
      }
      else if (event.key === "e") {
        tab.index = tab.text.indexOf("\n", tab.index)
        if (tab.index === -1) tab.index = tab.text.length
      }
      else if (event.key === "a") {
        tab.index = tab.text.lastIndexOf("\n", tab.index - 1) + 1
      }
      else if (event.key === "c") {
        this.cursor.material.color.setHex(0)
        this.frozen = true

        const code = tab.text.substring(0, tab.index)
        fetch('/complete-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: code
        }).then(response => response.json())
          .then(data => {
            if (data.completions.length > 0) {
              this.insert(data.completions[0].displayText)
              this.update()
            }
            this.cursor.material.color.setHex(0xffffff)
            this.frozen = false
          })
      }
      else if (event.key === "l") {
        if (util.isTerminal(tab.text)) {
          tab.text = "> "
          tab.index = 2
        }
        else {
          const [row, col] = this.getRowCol()
          tab.offset = row - 5
        }

        tab.clearCanvas()
      }
      else if (event.key === "h") {
        this.toggleVisibility()
      }
      else if (event.key === "i") {
        const terminalTab = this.getTerminalTab()
        if (terminalTab === this.currentTab) {
          this.currentTab = this.savedCurrentTab
        }
        else {
          this.savedCurrentTab = this.currentTab
          this.currentTab = terminalTab
        }
      }
      else if (event.key === " ") {
        tab.mark = tab.index
      }
      else if (event.key === "g") {
        tab.mark = -1
      }
      else if (event.key === "y") {
        this.insert(this.clipboard)
      }
      else if (event.key === "w") {
        this.clipboard = tab.text.substring(tab.index, tab.mark)
        this.erase(tab.mark - tab.index)
        tab.mark = -1
      }
    }
    else if (event.key === "Backspace") {
      this.erase(-1)
    }
    else if (event.key === "Delete") {
      this.erase(1)
    }
    else if (event.key === "Enter") {
      if (util.isTerminal(tab.text)) {
        this.execute()
        this.tabs[this.currentTab].saved = true
      }
      else {
        this.newLine()
      }
    }
    else if (event.key === "ArrowLeft") {
      this.moveCursor(-1, 0)
    }
    else if (event.key === "ArrowRight") {
      this.moveCursor(1, 0)
    }
    else if (event.key === "ArrowUp") {
      this.moveCursor(0, -1)
    }
    else if (event.key === "ArrowDown") {
      this.moveCursor(0, 1)
    }
    else if (event.key === "}") {
      const text = tab.text.substring(0, tab.index)
      const indent = this.calculateIndentation(text)
      const indent2 = this.calculateIndentation(text + "}")
      const start = text.lastIndexOf("\n")
      const line = text.substring(start + 1).replace(/ /g, "")

      if (indent2.length < indent.length && line === "") {
        this.erase(-2)
      }
      this.insert("}")
    }
    else if (event.key === "Tab") {
      this.insert("  ")
    }
    else if (util.isPrintable(event.key) && event.key.length === 1) {
      this.insert(event.key)
    }
    this.update()
  }

  onPointerDown(event) {
    this.tabs[this.currentTab].onPointerDown(event)
  }

  onPointerMove(event) {
    this.pointer.visible = true

    if (this.pointerTimeout) {
      clearTimeout(this.pointerTimeout)
    }
    this.pointerTimeout = setTimeout(() => {
      this.pointer.visible = false
    }, 1000)

    this.tabs[this.currentTab].onPointerMove(event)
  }

  onPointerUp(event) {
    this.tabs[this.currentTab].onPointerUp(event)
  }

  onResize(event) {
    this.tabs[this.currentTab].onResize(event)
  }

  hide () {
    this.visible = false
  }

  show () {
    this.position.copy(avatar.position)
    const direction = new THREE.Vector3(0, 0, -1)
    direction.applyEuler(camera.rotation)
    direction.applyEuler(avatar.rotation)
    direction.y = 0
    direction.normalize().multiplyScalar(2)
    this.position.add(direction)
    this.position.y += 1
    const eye = new THREE.Vector3().copy(avatar.position)
    eye.y += 1
    this.lookAt(eye)
    const quarterTurn = new THREE.Euler(0, util.toRadians(90), 0)
    direction.applyEuler(quarterTurn)
    direction.normalize().multiplyScalar(-0.4)
    this.position.add(direction)
    this.visible = true
    this.updateClippingPlanes()
  }

  toggleVisibility () {
    if (this.visible) {
      this.hide()
    }
    else {
      this.show()
    }
  }
}

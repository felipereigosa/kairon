import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { highlight } from './highlight';

const textOffset = [-2, 2];

export class Editor {
  constructor(scene) {
    this.mesh = this.createPlane(9, 5, 0.2);
    this.codeBlocks = [{text: "const x = 10;\nconsole.log('value = ' + x);",
                        index: 0}];
    this.tab = 0;
    this.cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.3),
                                 new THREE.MeshBasicMaterial({color: 0x101010}));
    this.cursor.position.set(textOffset[0] + 0.08, textOffset[1] + 0.1, 0.01);
    this.mesh.add(this.cursor);

    const fontLoader = new FontLoader();
    fontLoader.load('/droid_sans_mono_regular.typeface.json', (font) => {
      this.font = font;
      const shapes = font.generateShapes("", 1);
      const geometry = new THREE.ShapeGeometry(shapes);
      const material = new THREE.MeshBasicMaterial({transparent: true,
                                                    opacity: 0.8});
      const template = new THREE.Mesh(geometry, material);
      template.scale.set(0.2, 0.2, 0.2);
      template.position.set(textOffset[0], textOffset[1], 0.02);

      const colors = {"red": 0xff0020,
                      "green": 0x20ff20,
                      "white": 0xffffff,
                      "blue": 0x2020ff,
                      "orange": 0xffa020,
                      "gray": 0x808080,
                      "yellow": 0xffff20,
                      "lightblue": 0x20ffff,
                      "purple": 0x710096,
                      "teal": 0x008080,
                     };

      for (let color of Object.keys(colors)) {
        const mesh = template.clone();
        mesh.name = color;
        mesh.material = template.material.clone();
        mesh.material.color.set(colors[color]);
        this.mesh.add(mesh);
      }

      this.tabSelector = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3),
                                        new THREE.MeshBasicMaterial({color: 0x101010}));
      this.tabSelector.position.set(-3.3, 2.06 - 0.3, 0.01);
      this.mesh.add(this.tabSelector);

      const tabShapes = font.generateShapes("createSphe...\nbar\nsomething", 0.8);
      this.tabText = new THREE.Mesh(new THREE.ShapeGeometry(tabShapes),
                                    new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
      this.tabText.scale.set(0.2, 0.2, 0.2);
      this.tabText.position.set(textOffset[0] - 2.2, textOffset[1], 0.02);
      this.mesh.add(this.tabText);

      this.update();
    });

    const divider = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
                                   new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
    divider.position.set(textOffset[0] - 0.3, 0, 0.01);
    divider.scale.set(0.01, 4.5, 1);

    this.mesh.add(divider);
  }

  createPlane (width, height, radius) {
    let shape = new THREE.Shape();
    const left = -width / 2, top =  -height / 2;
    const right = width / 2, bottom = height / 2;

    shape.moveTo(left, top + radius);
    shape.lineTo(left, bottom - radius);
    shape.quadraticCurveTo(left, bottom, left + radius, bottom);
    shape.lineTo(right - radius, bottom);
    shape.quadraticCurveTo(right, bottom, right, bottom - radius);
    shape.lineTo(right, top + radius);
    shape.quadraticCurveTo(right, top, right - radius, top);
    shape.lineTo(left + radius, top);
    shape.quadraticCurveTo(left, top, left, top + radius);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0,
      bevelEnabled: false
    });

    const material = new THREE.MeshBasicMaterial({
      color: 'black',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    return new THREE.Mesh(geometry, material);
  }

  getTotal (row) {
    const block = this.codeBlocks[this.tab];
    const lines = block.text.split("\n");
    return lines.slice(0, row).reduce((acc, x) => acc + x.length + 1, 0);
  }

  getRowCol () {
    const block = this.codeBlocks[this.tab];
    const index = block.index;
    const before = block.text.substring(0, index);
    const lines = before.split("\n");
    const row = lines.length - 1;
    const col = index - this.getTotal(row);
    return [row, col];
  }

  setRowCol (row, col) {
    const block = this.codeBlocks[this.tab];
    const lines = block.text.split("\n");
    col = Math.min(lines[row].length, col);
    block.index = this.getTotal(row) + col;
  }

  update () {
    const block = this.codeBlocks[this.tab];
    const result = highlight(block.text);

    for (let color of Object.keys(result)) {
      const colorMesh = this.mesh.getObjectByName(color);
      colorMesh.geometry.dispose();
      const shapes = this.font.generateShapes(result[color], 1);
      colorMesh.geometry = new THREE.ShapeGeometry(shapes);
    }

    const [row, col] = this.getRowCol();
    this.cursor.position.set(textOffset[0] + 0.08 + 0.167 * col,
                             textOffset[1] + 0.1 - 0.39 * row,
                             0.01);

    this.tabSelector.position.set(-3.3, 2.06 - 0.3 * this.tab, 0.01);

    this.tabText.geometry.dispose();

    let text = "";
    for (let i = 0; i < this.codeBlocks.length; i++) {
      text += "" + i + "\n";
    }
    const shapes = this.font.generateShapes(text, 0.8);
    this.tabText.geometry = new THREE.ShapeGeometry(shapes);
  }

  splitText () {
    const block = this.codeBlocks[this.tab];
    const before = block.text.substring(0, block.index);
    const after = block.text.substring(block.index);
    return [before, after];
  }

  insert (key) {
    const [before, after] = this.splitText();
    const block = this.codeBlocks[this.tab];
    block.text = before + key + after;
    block.index += 1;
    this.update();
  }

  moveCursor (x, y) {
    const block = this.codeBlocks[this.tab];
    if (x < 0) {
      block.index = Math.max(0, block.index - 1);
    } else if (x > 0) {
      block.index = Math.min(block.index + 1, block.text.length);
    }
    else if (y < 0) {
      const [row, col] = this.getRowCol();
      if (row > 0) {
        this.setRowCol(row - 1, col);
      }
    }
    else if (y > 0) {
      const [row, col] = this.getRowCol();
      const lines = block.text.split("\n");
      if (row < lines.length - 1) {
        this.setRowCol(row + 1, col);
      }
    }
    this.update();
  }

  erase (offset) {
    const [before, after] = this.splitText();
    const block = this.codeBlocks[this.tab];
    if (offset < 0) {
      block.text = before.substring(0, before.length + offset) + after;
      block.index = Math.max(0, block.index + offset);
    } else {
      block.text = before + after.substring(offset);
    }
    this.update();
  }

  execute () {
    const code = `import * as THREE from 'three';
                  export function run (scene) {
                    ${this.codeBlocks[this.tab].text}
                  }
                 // ${Date.now()}`;

    fetch('/update-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: code
    });
  }

  nextBlock () {
    this.tab = (this.tab + 1) % this.codeBlocks.length;
    this.update();
  }

  previousBlock () {
    const len = this.codeBlocks.length;
    this.tab = (this.tab - 1 + len) % this.codeBlocks.length;
    this.update();
  }

  onKeyDown (event) {
    if (event.ctrlKey && event.shiftKey) {
      if (event.key === "F") {
        this.execute();
      }
      else if (event.key === "Tab") {
        this.previousBlock();
      }
    }
    else if (event.ctrlKey) {
      if (event.key === "Tab") {
        this.nextBlock();
      }
      else if (event.key === "t") {
        this.codeBlocks.push({text: "", index: 0});
        this.tab = this.codeBlocks.length - 1;
        this.update();
      }
    }
    else if (event.key === "Backspace") {
      this.erase(-1);
    }
    else if (event.key === "Delete") {
      this.erase(1);
    }
    else if (event.key === "Enter") {
      this.insert("\n");
    }
    else if (event.key === "ArrowLeft") {
      this.moveCursor(-1, 0);
    }
    else if (event.key === "ArrowRight") {
      this.moveCursor(1, 0);
    }
    else if (event.key === "ArrowUp") {
      this.moveCursor(0, -1);
    }
    else if (event.key === "ArrowDown") {
      this.moveCursor(0, 1);
    }
    else if (event.key.match(/[a-z0-9`~!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? ]/i) &&
             event.key.length === 1) {
      this.insert(event.key);
    }
    else if (event.key === "Tab") {
      this.insert("  ");
    }
  }
}

import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { highlight } from './highlight';

export class Editor {
  constructor(scene) {
    this.mesh = this.createPlane(7, 5, 0.2);
    this.codeBlocks = [{text: "const x = 10;\nconsole.log('value = ' + x);",
                        index: 5},
                       {text: "const second = 2;",
                        index: 0},
                       {text: "const third = 3;",
                        index: 0},
                      ];
    this.codeBlock = this.codeBlocks[0];

    this.cursor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
                                 new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
    this.cursor.position.set(-2.92, 2.1, 0.01);
    this.cursor.scale.set(0.15, 0.3, 1);
    this.mesh.add(this.cursor);

    const fontLoader = new FontLoader();
    fontLoader.load('/droid_sans_mono_regular.typeface.json', (font) => {
      const material = new THREE.MeshBasicMaterial( {
        color: 0,
        transparent: true,
        opacity: 0.8,
      });

      this.font = font;
      const shapes = font.generateShapes("", 1);
      const geometry = new THREE.ShapeGeometry(shapes);
      const template = new THREE.Mesh(geometry, material);
      template.scale.set(0.2, 0.2, 0.2);
      template.position.set(-3, 2, 0.02);

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

      this.update();
    });
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
    const lines = this.codeBlock.text.split("\n");
    return lines.slice(0, row).reduce((acc, x) => acc + x.length + 1, 0);
  }

  getRowCol () {
    const index = this.codeBlock.index;
    const before = this.codeBlock.text.substring(0, index);
    const lines = before.split("\n");
    const row = lines.length - 1;
    const col = index - this.getTotal(row);
    return [row, col];
  }

  setRowCol (row, col) {
    const lines = this.codeBlock.text.split("\n");
    col = Math.min(lines[row].length, col);
    this.codeBlock.index = this.getTotal(row) + col;
  }

  update () {
    const result = highlight(this.codeBlock.text);

    for (let color of Object.keys(result)) {
      const colorMesh = this.mesh.getObjectByName(color);
      colorMesh.geometry.dispose();
      const shapes = this.font.generateShapes(result[color], 1);
      colorMesh.geometry = new THREE.ShapeGeometry(shapes);
    }

    const [row, col] = this.getRowCol();
    this.cursor.position.set(-2.92 + 0.167 * col,
                             2.1 - 0.39 * row,
                             0.01);
  }

  splitText () {
    const before = this.codeBlock.text.substring(0, this.codeBlock.index);
    const after = this.codeBlock.text.substring(this.codeBlock.index);
    return [before, after];
  }

  insert (key) {
    const [before, after] = this.splitText();
    this.codeBlock.text = before + key + after;
    this.codeBlock.index += 1;
    this.update();
  }

  moveCursor (x, y) {
    if (x < 0) {
      this.codeBlock.index = Math.max(0, this.codeBlock.index - 1);
    } else if (x > 0) {
      this.codeBlock.index = Math.min(this.codeBlock.index + 1,
                                      this.codeBlock.text.length);
    }
    else if (y < 0) {
      const [row, col] = this.getRowCol();
      if (row > 0) {
        this.setRowCol(row - 1, col);
      }
    }
    else if (y > 0) {
      const [row, col] = this.getRowCol();
      const lines = this.codeBlock.text.split("\n");
      if (row < lines.length - 1) {
        this.setRowCol(row + 1, col);
      }
    }
    this.update();
  }

  erase (offset) {
    const [before, after] = this.splitText();
    if (offset < 0) {
      this.codeBlock.text = before.substring(0, before.length + offset) + after;
      this.codeBlock.index = Math.max(0, this.codeBlock.index + offset);
    } else {
      this.codeBlock.text = before + after.substring(offset);
    }
    this.update();
  }

  execute () {
    const code = `import * as THREE from 'three';
                  export function run (scene) {
                    ${this.codeBlock.text}
                  }
                 // ${Date.now()}`;

    fetch('/update-cube', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: code
    });
  }

  getBlock () {
    return this.codeBlocks.indexOf(this.codeBlock);
  }

  setBlock (block) {
    this.codeBlock = this.codeBlocks[block];
    this.update();
  }

  nextBlock () {
    const block = (this.getBlock() + 1) % this.codeBlocks.length;
    this.setBlock(block);
  }

  previousBlock () {
    const len = this.codeBlocks.length;
    const block = (this.getBlock() - 1 + len) % len;
    this.setBlock(block);
  }

  onKeyDown (event) {
    if (event.ctrlKey && event.shiftKey) {
      if (event.key === "F") {
        this.execute();
      }
      else if (event.key === "S") {
        this.nextBlock();
      }
      else if (event.key === "X") {
        this.previousBlock();
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

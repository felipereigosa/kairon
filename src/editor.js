import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as esprima from 'esprima';
import { highlight } from './highlight';
import * as util from './util';
import { colors } from './colors';

const textOffset = [-3.5, 2];

export class Editor {
  constructor(scene) {
    this.mesh = util.createRoundedPlane(12, 5, 0.2);
    this.codeBlocks = [{text: "", index: 0}];
    this.tab = 0;
    this.cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.3),
                                 new THREE.MeshBasicMaterial({color: 0xffffff}));
    this.cursor.position.set(textOffset[0] + 0.08, textOffset[1] + 0.1, 0.01);
    this.mesh.add(this.cursor);

    const fontLoader = new FontLoader();
    fontLoader.load('/droid_sans_mono_regular.typeface.json', (font) => {
      this.font = font;
      const shapes = font.generateShapes("", 1);
      const geometry = new THREE.ShapeGeometry(shapes);
      const material = new THREE.MeshBasicMaterial();
      const template = new THREE.Mesh(geometry, material);
      template.scale.set(0.2, 0.2, 0.2);
      template.position.set(textOffset[0], textOffset[1], 0.02);

      for (let color of Object.keys(colors)) {
        const mesh = template.clone();
        mesh.name = color;
        mesh.material = template.material.clone();
        mesh.material.color.set(colors[color]);
        this.mesh.add(mesh);
      }

      this.tabSelector = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.3),
                                        new THREE.MeshBasicMaterial({color: 0x101010}));
      this.tabSelector.position.set(textOffset[0] - 1.4, 2.06 - 0.3, 0.01);
      this.mesh.add(this.tabSelector);

      const tabShapes = font.generateShapes("", 0.8);
      const tabGeometry = new THREE.ShapeGeometry(tabShapes);
      const tabMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
      this.tabTexts = [];

      for (let i = 0; i < 10; i++) {
        const tabText = new THREE.Mesh(tabGeometry, tabMaterial);
        tabText.scale.set(0.15, 0.15, 0.15);
        tabText.position.set(textOffset[0] - 2.35,
                             textOffset[1] - i * 0.35,
                             0.02);
        tabText.saved = true;
        this.mesh.add(tabText);
        this.tabTexts.push(tabText);
      }

      this.update();
    });

    const divider = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
                                   new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
    divider.position.set(textOffset[0] - 0.3, 0, 0.01);
    divider.scale.set(0.01, 4.5, 1);

    this.mesh.add(divider);
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

  getTabTitle (text, saved) {
    text = text.trim();
    let title = "";

    const nextToken = (t, i, stop) => {
      const index = text.indexOf(stop);
      if (index === -1) {
        return t.slice(i).trim();
      }
      else {
        return t.slice(i, index).trim();
      }
    };

    if (text.startsWith(">")) {
      title = "terminal";
    }
    else if (text.startsWith("//")) {
      title = text.split("\n")[0].slice(2).trim();
    }
    else if (text.startsWith("function")) {
      title = nextToken(text, 8, "(");
    }
    else if (text.startsWith("const")) {
      title = nextToken(text, 5, "=");
    }
    else {
      title = text.split("\n")[0];
    }

    title = (saved ? "" : "* ") + title;

    if (title.length > 20) {
      title = title.slice(0, 17) + "...";
    }

    return title;
  }

  update () {
    const block = this.codeBlocks[this.tab];
    const result = highlight(block.text);

    result.black = block.text;
    result.black = result.black.replace(/[\x20-\x7E]/gs, ' ');
    if (block.index !== block.text.length) {
      result.black = util.replaceChar(result.black,
                                      block.index,
                                      block.text[block.index]);
    }

    for (let color of Object.keys(result)) {
      const colorMesh = this.mesh.getObjectByName(color);
      colorMesh.geometry.dispose();
      let text = result[color];
      if (util.isPrintable(text[block.index]) && color !== "black") {
        text = util.replaceChar(text, block.index, ' ');
      }
      const shapes = this.font.generateShapes(text, 1);
      colorMesh.geometry = new THREE.ShapeGeometry(shapes);
    }

    const [row, col] = this.getRowCol();
    this.cursor.position.set(textOffset[0] + 0.08 + 0.167 * col,
                             textOffset[1] + 0.1 - 0.39 * row,
                             0.01);

    this.tabSelector.position.y = 2.06 - 0.35 * this.tab;

    for (let i = 0; i < this.codeBlocks.length; i++) {
      const tabText = this.tabTexts[i];
      tabText.geometry.dispose();
      let title = this.getTabTitle(this.codeBlocks[i].text, tabText.saved);
      const shapes = this.font.generateShapes(title, 0.8);
      tabText.geometry = new THREE.ShapeGeometry(shapes);
    }
  }

  insert (text) {
    const block = this.codeBlocks[this.tab];
    const [before, after] = util.splitText(block.text, block.index);
    this.tabTexts[this.tab].saved = false;
    block.text = before + text + after;
    block.index += text.length;
  }

  moveCursor (x, y) {
    const block = this.codeBlocks[this.tab];
    if (x < 0) {
      block.index = Math.max(0, block.index + x);
    } else if (x > 0) {
      block.index = Math.min(block.index + x, block.text.length);
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
  }

  erase (offset) {
    const block = this.codeBlocks[this.tab];
    const [before, after] = util.splitText(block.text, block.index);
    this.tabTexts[this.tab].saved = false;
    if (offset < 0) {
      block.text = before.substring(0, before.length + offset) + after;
      block.index = Math.max(0, block.index + offset);
    } else {
      block.text = before + after.substring(offset);
    }
  }

  getGlobals (code) {
    const ast = esprima.parseScript(code);
    const topLevelIdentifiers = [];
    for (const statement of ast.body) {
      if (statement.type === 'FunctionDeclaration') {
        topLevelIdentifiers.push(statement.id.name);
      } else if (statement.type === 'VariableDeclaration') {
        for (const declaration of statement.declarations) {
          topLevelIdentifiers.push(declaration.id.name);
        }
      }
    }
    return topLevelIdentifiers;
  }

  parseCommand (code) {
    const trimmed = code.trim();
    if (trimmed.startsWith(">")) {
      const lines = trimmed.split("\n");
      const line = lines[lines.length - 1]
      const parts =  line.trim().slice(1).match(/(["'])(\\?.)*?\1|\S+/g);

      if (!parts) {
        return '';
      }
      const functionName = parts.shift();

      const functionArgs = parts.map(arg => {
        if ((arg.startsWith("'") && arg.endsWith("'")) ||
            (arg.startsWith('"') && arg.endsWith('"'))) {
          return arg;
        } else if (isNaN(arg)) {
          return `"${arg}"`;
        } else {
          return arg;
        }
      }).join(", ");

      return `${functionName}(${functionArgs});`;
    } else {
      return code;
    }
  }

  execute () {
    const text = this.parseCommand(this.codeBlocks[this.tab].text);
    const globals = this.getGlobals(text)
          .map(x => `window.${x} = ${x};`).join("\n");

    const code = `import * as THREE from 'three';
                  import * as util from './util';

                  export function run (scene) {
                    try {
                      ${text}
                      ${globals}
                    } catch (error) {
                      console.log(error);
                    }
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

  handleOutput (output) {
    if (this.codeBlocks[this.tab].text.trim().startsWith(">")) {
      this.codeBlocks[this.tab].text += '\n' + output + '> ';
      this.codeBlocks[this.tab].index = this.codeBlocks[this.tab].text.length;

      this.update();
    }
    else {
      // other output
      console.log(["###", output]);
    }
  }

  nextBlock () {
    this.tab = (this.tab + 1) % this.codeBlocks.length;
  }

  previousBlock () {
    const len = this.codeBlocks.length;
    this.tab = (this.tab - 1 + len) % this.codeBlocks.length;
  }

  calculateIndentation (code) {
    let indent = 0;
    let openBraces = 0;
    let closeBraces = 0;

    for (let i = 0; i < code.length; i++) {
      if (code[i] === "{") {
        openBraces++;
      }
      else if (code[i] === "}") {
        closeBraces++;
      }
    }

    if (openBraces > closeBraces) {
      indent = (openBraces - closeBraces) * 2;
    }

    let indentString = "";
    for (let i = 0; i < indent; i++) {
      indentString += " ";
    }

    return indentString;
  }

  newLine () {
    const block = this.codeBlocks[this.tab];
    const [before, after] = util.splitText(block.text, block.index);
    const indent = this.calculateIndentation(before);
    block.text = before + "\n" + indent + after;
    block.index += indent.length + 1;
  }

  prevWordIndex (text, index) {
    let r = /[a-zA-Z0-9_$]/g;
    index -= 2;
    while ((r.lastIndex = 0, !r.test(text[index])) ||
           (r.lastIndex = 0, r.test(text[index - 1]))) {
      index -= 1;

      if (index < 0) {
        index = 0;
        break;
      }
    }
    return index;
  }

  nextWordIndex (text, index) {
    let r = /[a-zA-Z0-9_$]/g;
    index += 1;
    while ((r.lastIndex = 0, !r.test(text[index])) ||
           (r.lastIndex = 0, r.test(text[index + 1]))) {
      index += 1;
      if (index >= text.length) {
        index = text.length - 1;
        break;
      }
    }
    return index + 1;
  }

  onKeyDown (event) {
    const block = this.codeBlocks[this.tab];

    if (event.altKey && event.shiftKey) {
      if (event.key === "<") {
        block.index = 0;
      }
      else if (event.key === ">") {
        block.index = block.text.length;
      }
    }
    else if (event.ctrlKey && event.shiftKey) {
      if (event.key === "J") {
        this.execute();
        this.tabTexts[this.tab].saved = true;
      }
      else if (event.key === "P") {
        this.insert("console.log();");
        this.moveCursor(-2, 0);
       }
      else if (event.key === "Tab") {
        this.previousBlock();
      }
    }
    else if (event.altKey) {
      if (event.key === "f") {
        block.index = this.nextWordIndex(block.text, block.index);
      }
      else if (event.key === "b") {
        block.index = this.prevWordIndex(block.text, block.index);
      }
      else if (event.key === "d") {
        const index = this.nextWordIndex(block.text, block.index);
        this.erase(index - block.index);
      }
      else if (event.key === "Backspace") {
        const index = this.prevWordIndex(block.text, block.index);
        this.erase(index - block.index);
      }
    }
    else if (event.ctrlKey) {
      if (event.key.match(/^[0-9]$/)) {
        const index = parseInt(event.key);
        if (index < this.codeBlocks.length) {
          this.tab = index;
        }
      }
      else if (event.key === "Tab") {
        this.nextBlock();
      }
      else if (event.key === "t") {
        this.codeBlocks.push({text: "", index: 0});
        this.tab = this.codeBlocks.length - 1;
      }
      else if (event.key === "j") {
        this.newLine();
      }
      else if (event.key === "k") {
        let index = block.text.indexOf("\n", block.index);
        if (index === -1) {
          index = block.text.length;
        }
        let l = block.text.substring(block.index, index).length;
        if (l === 0) l = 1;
        this.erase(l);
      }
      else if (event.key === "d") {
        this.erase(1);
      }
      else if (event.key === "f") {
        this.moveCursor(1, 0);
      }
      else if (event.key === "b") {
        this.moveCursor(-1, 0);
      }
      else if (event.key === "n") {
        this.moveCursor(0, 1);
      }
      else if (event.key === "p") {
        this.moveCursor(0, -1);
      }
      else if (event.key === "e") {
        block.index = block.text.indexOf("\n", block.index);
        if (block.index === -1) block.index = block.text.length;
      }
      else if (event.key === "a") {
        block.index = block.text.lastIndexOf("\n", block.index - 1) + 1;
      }
    }
    else if (event.key === "Backspace") {
      this.erase(-1);
    }
    else if (event.key === "Delete") {
      this.erase(1);
    }
    else if (event.key === "Enter") {
      this.newLine();
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
    else if (event.key === "}") {
      const text = block.text.substring(0, block.index);
      const indent = this.calculateIndentation(text);
      const indent2 = this.calculateIndentation(text + "}");
      const start = text.lastIndexOf("\n");
      const line = text.substring(start + 1).replace(/ /g, "");

      if (indent2.length < indent.length && line === "") {
        this.erase(-2);
      }
      this.insert("}");
    }
    else if (event.key === "Tab") {
      this.insert("  ");
    }
    else if (util.isPrintable(event.key) && event.key.length === 1) {
      this.insert(event.key);
    }
    this.update();
  }
}

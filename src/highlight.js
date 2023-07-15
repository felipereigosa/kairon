
const hljs = require('highlight.js');
import { colors } from './colors';
import * as util from './util';

const colorMap = {"hljs-keyword": "blue",
                  "hljs-string": "orange",
                  "hljs-number": "red",
                  "hljs-comment": "gray",
                  "hljs-title class_": "purple",
                  "hljs-title class_ inherited__": "purple",
                  "hljs-title function_": "yellow",
                  "hljs-literal": "lightblue",
                  "hljs-params": "green",
                  "hljs-property": "teal",
                  "hljs-variable language_": "purple",
                  "hljs-variable constant_": "red",
                  "hljs-subst": "red",
                  "hljs-attr": "teal",
                  "hljs-function": "white",
                 };

function useColors (code) {
  let result = code;
  for (let key of Object.keys(colorMap)) {
    let regex = new RegExp(`class="${key}"`, 'g');
    result = result.replace(regex, `class="${colorMap[key]}"`);
  }
  return result;
}

function highlightTerminal (code) {
  const lines = code.split('\n');
  return lines.map(l => {
    if (l.startsWith(">")) {
      return `<span class="green">${l}</span>`;
    } else {
      return l;
    }
  }).join('\n');
}

export function highlight (code) {
  if (util.isTerminal(code)) {
    code = highlightTerminal(code);
  }
  else {
    code = hljs.highlight(code, {language: 'javascript'}).value;
  }

  code = useColors(code);
  code = code.replace(/&quot;/g, '"');
  code = code.replace(/&gt;/g, '>');
  code = code.replace(/&lt;/g, '<');
  code = code.replace(/&amp;/g, '&');
  code = code.replace(/&#x27;/g, "'");

  let colorStack = ['white'];
  let colorDict = Object.keys(colors)
      .reduce((dict, color) => ({...dict, [color]: ''}), {});

  while (code.length > 0) {
    let span = code.match(/^<\/?span[^>]*>/g);

    if (span) {
      span = span[0];
      if (span.startsWith('</')) {
        colorStack.pop();
      }
      else {
        let color = span.match(/class="([^"]*)"/)[1];
        colorStack.push(color);
      }
      code = code.substring(span.length);
    }
    else {
      let currentColor = colorStack[colorStack.length - 1];
      Object.keys(colorDict).forEach(color => {
        if (color === currentColor || code[0] === '\n') {
          colorDict[color] += code[0];
        }
        else {
          colorDict[color] += ' ';
        }
      });
      code = code.substring(1);
    }
  }
  return colorDict;
}

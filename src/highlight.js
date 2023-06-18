
const hljs = require('highlight.js');

const colorMap = {"hljs-keyword": "blue",
                  "hljs-string": "orange",
                  "hljs-number": "red",
                  "hljs-comment": "gray",
                  "hljs-title class_": "purple",
                  "hljs-title function_": "yellow",
                  "hljs-literal": "lightblue",
                  "hljs-params": "green",
                  "hljs-property": "teal",
                  "hljs-variable language_": "purple",
                 };

function useColors (code) {
  let result = code;
  for (let key of Object.keys(colorMap)) {
    let regex = new RegExp(`class="${key}"`, 'g');
    result = result.replace(regex, `class="${colorMap[key]}"`);
  }
  return result;
}

function removeAllSpans (code) {
  return code.replace(/<span class=".*?">(.*?)<\/span>/g,
                      function(match, contents) {
                        return " ".repeat(contents.length);
                      });
}

function removeColorSpans (code, color) {
  const regex = new RegExp(`<span class="${color}">(.*?)<\/span>`, 'g');
  return code.replace(regex, "$1");
}

function getColor (code, rest, color) {
  let result = code;
  result = removeColorSpans(result, color);
  result = removeAllSpans(result);
  return subtractStrings(result, rest);
}

function subtractStrings (s1, s2) {
  let result = '';
  for (let i = 0; i < s1.length; i++) {
    if (s1[i] === s2[i] && s1[i] !== '\n') {
      result += ' ';
    } else {
      result += s1[i];
    }
  }
  return result;
}

export function highlight (code) {
  let temp = hljs.highlight('javascript', code).value;

  temp = temp.replace(/<span class="hljs-subst">(.*?)<\/span>/g, "$1");
  temp = useColors(temp);
  temp = temp.replace(/&quot;/g, '"');
  temp = temp.replace(/&gt;/g, '>');
  temp = temp.replace(/&lt;/g, '<');
  temp = temp.replace(/&amp;/g, '&');
  temp = temp.replace(/&#x27;/g, "'");

  const rest = removeAllSpans(temp);

  const result = {};
  const colors = [...new Set(Object.values(colorMap))]
  for (let color of colors) {
    result[color] = getColor(temp, rest, color);
  }
  result['white'] = rest;
  return result;
}

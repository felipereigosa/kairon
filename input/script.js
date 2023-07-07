
function selectKeys(obj, keys) {
  return keys.reduce((newObj, key) => {
    if (key in obj) {
      newObj[key] = obj[key];
    }
    return newObj;
  }, {});
}

document.body.addEventListener('keydown', (event) => {
  event.preventDefault();
  const keys = ['key', 'ctrlKey', 'shiftKey', 'altKey', 'metaKey'];
  window.electron.send('keydown', selectKeys(event, keys));
});

document.body.addEventListener('mousedown', (event) => {
  event.preventDefault();
  const keys = ['x', 'y', 'button'];
  const newEvent = selectKeys(event, keys);
  newEvent.pressure = 0.5;
  newEvent.type = 'pointerdown';
  window.electron.send('pointerdown', newEvent);
});

document.body.addEventListener('pointermove', (event) => {
  event.preventDefault();
  const keys = ['x', 'y', 'type', 'pressure'];
  window.electron.send('pointermove', selectKeys(event, keys));
});

document.body.addEventListener('mouseup', (event) => {
  event.preventDefault();
  const keys = ['x', 'y', 'button', 'type'];
  const newEvent = selectKeys(event, keys);
  newEvent.pressure = 0.5;
  newEvent.type = 'pointerup';
  window.electron.send('pointerup', newEvent);
});

window.addEventListener('resize', (event) => {
  event.preventDefault();
  window.electron.send('resize', {type: "resize",
                                  width: window.innerWidth,
                                  height: window.innerHeight});
});


document.body.addEventListener('keydown', (event) => {
  const simplifiedEvent = {
    key: event.key,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
  window.electron.send('keydown', simplifiedEvent);
});
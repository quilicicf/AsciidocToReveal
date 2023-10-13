function toggleDisabled (mode, force = undefined) {
  [ ...document.querySelectorAll(`style[id$=_${mode}]`) ]
    .forEach((sheetNode) => sheetNode.disabled = force === undefined ? !sheetNode.disabled : force);
}

Reveal.addKeyBinding({ keyCode: 84, key: 'T', description: 'Switch themes' }, () => {
  const bodyNode = document.querySelector('body');
  bodyNode.classList.toggle('theme-dark');
  bodyNode.classList.toggle('theme-light');

  toggleDisabled('DARK');
  toggleDisabled('LIGHT');
});

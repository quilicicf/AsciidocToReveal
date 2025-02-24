import { ThemeClass } from '../domain/api.ts';

export const MANUAL_THEME_SWITCHER: string = `\
Reveal.addKeyBinding({ keyCode: 84, key: "T", description: "Switch themes" }, () => {
  const bodyNode = document.querySelector("body");
  bodyNode.classList.toggle("${ThemeClass.DARK}");
  bodyNode.classList.toggle("${ThemeClass.LIGHT}");
});
`;

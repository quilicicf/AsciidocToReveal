export default function registerInlineSvgIconsExtension (registry) {
  registry.register(function setInlineMacro () { this.inlineMacro(iconMacro); });
}

function iconMacro () {
  const self = this;
  self.named('icon');
  self.process(function process (parent, iconName, attributes) {
    const svgImport = `
      <svg height="16" width="16" class="inline-icon">
        <use href="#${iconName}-icon"/>
      </svg>
    `;
    return self.createInlinePass(parent, svgImport, { attributes: { role: attributes.role } });
  });
}

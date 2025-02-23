import { AsciidoctorExtensions, AsciidoctorInlineMacroProcessorDsl, AsciidoctorRegistry } from '../../domain/api.ts';
import { inlineDslAsProcessor } from '../dsl-as-processor.ts';

export default function registerInlineSvgIconsExtension (registry: AsciidoctorExtensions) {
  registry.register(function setInlineMacro () {
    (this as AsciidoctorRegistry).inlineMacro(function iconMacro (this: AsciidoctorInlineMacroProcessorDsl) {
      // deno-lint-ignore no-this-alias
      const self: AsciidoctorInlineMacroProcessorDsl = this;
      self.named('icon');
      self.process(function process (parent, iconName, attributes) {
        const svgImport = `
      <svg height="16" width="16" class="inline-icon">
        <use href="#${iconName}-icon"/>
      </svg>
    `;
        return inlineDslAsProcessor(self).createInlinePass(parent, svgImport, { attributes: { role: attributes.role } });
      });
    });
  });
}

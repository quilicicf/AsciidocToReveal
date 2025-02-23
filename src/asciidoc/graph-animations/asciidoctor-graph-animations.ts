import json5 from 'json5';

import {
  AsciidoctorBlockProcessorDsl,
  AsciidoctorDocument,
  AsciidoctorExtensions, AsciidoctorReader,
  AsciidoctorRegistry,
  GraphAnimationsMap,
} from '../../domain/api.ts';

const GRAPH_ANIMATIONS: GraphAnimationsMap = {};

export default function registerGraphAnimationExtension (registry: AsciidoctorExtensions): GraphAnimationsMap {
  registry.register(function setBlock () {
    (this as AsciidoctorRegistry).block(function graphAnimationBlock (this: AsciidoctorBlockProcessorDsl): void {
      // deno-lint-ignore no-this-alias
      const self: AsciidoctorBlockProcessorDsl = this;
      self.named('graph-animation');
      self.onContext('listing');
      self.positionalAttributes([ 'graphId' ]);

      self.process(function process (_parent: AsciidoctorDocument, reader: AsciidoctorReader, attributes: Record<string, string>): void {
        const contentAsString = reader.getLines().join('\n');
        GRAPH_ANIMATIONS[ attributes.graphId ] = json5.parse(contentAsString);
      });
    });
  });
  return GRAPH_ANIMATIONS;
}

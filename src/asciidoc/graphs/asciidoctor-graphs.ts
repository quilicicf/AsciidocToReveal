import {
  AsciidoctorBlock,
  AsciidoctorBlockProcessorDsl,
  AsciidoctorDocument,
  AsciidoctorExtensions,
  AsciidoctorReader,
  AsciidoctorRegistry,
  DomId,
  GraphInputText,
  GraphMap,
} from '../../domain/api.ts';
import { blockDslAsProcessor } from '../dsl-as-processor.ts';

const GRAPHS: GraphMap = {};

export default function registerGraphExtension (registry: AsciidoctorExtensions) {
  registry.register(function setBlock () {
    (this as AsciidoctorRegistry).block(function graphBlock (this: AsciidoctorBlockProcessorDsl): void {
      // deno-lint-ignore no-this-alias
      const self: AsciidoctorBlockProcessorDsl = this;
      self.named('graph');
      self.onContext('listing');
      self.positionalAttributes([ 'graphId' ]);

      self.process(function process (parent: AsciidoctorDocument, reader: AsciidoctorReader, attributes: Record<string, string>): AsciidoctorBlock {
        const { graphId } = attributes;
        GRAPHS[ graphId as DomId ] = reader.getLines().join('\n') as GraphInputText;
        return blockDslAsProcessor(self).createBlock(parent, 'listing', 'GRAPH WAITING FOR BUILD', {
          id: `graph-${attributes.graphId}`,
          role: attributes.role,
        });
      });
    });
  });
  return GRAPHS;
}

import json5 from 'npm:json5';

const GRAPH_ANIMATIONS = {};

export default function registerGraphAnimationExtension (registry) {
  registry.register(function setBlock () { this.block(graphAnimationBlock); });
  return GRAPH_ANIMATIONS;
}

function graphAnimationBlock () {
  const self = this;
  self.named('graph-animation');
  self.onContext('listing');
  self.positionalAttributes([ 'graphId' ]);

  self.process(function process (parent, reader, attributes) {
    const contentAsString = reader.getLines().join('\n');
    GRAPH_ANIMATIONS[ attributes.graphId ] = json5.parse(contentAsString);
  });
}

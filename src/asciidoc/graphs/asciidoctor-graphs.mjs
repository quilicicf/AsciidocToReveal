const GRAPHS = {};

export default function registerGraphExtension (registry) {
  registry.register(function setBlock () { this.block(graphBlock); });
  return GRAPHS;
}

function graphBlock () {
  const self = this;
  self.named('graph');
  self.onContext('listing');
  self.positionalAttributes([ 'graphId' ]);

  self.process(function process (parent, reader, attributes) {
    const graphId = attributes.graphId;
    GRAPHS[ graphId ] = reader.getLines().join('\n');
    return self.createBlock(parent, 'listing', 'GRAPH WAITING FOR BUILD', { id: `graph-${attributes.graphId}`, role: attributes.role });
  });
}

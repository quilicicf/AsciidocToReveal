export default function processBlocksRecursively (currentBlock, blockVisitor) {
  currentBlock.getBlocks()
    .forEach((childBlock) => {
      blockVisitor(childBlock);
      processBlocksRecursively(childBlock, blockVisitor);
    });
}

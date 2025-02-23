import { AsciidoctorBlock } from '../domain/api.ts';

export type BlockVisitor = (block: AsciidoctorBlock) => void;

export default function processBlocksRecursively (currentBlock: AsciidoctorBlock, blockVisitor: BlockVisitor): void {
  currentBlock.getBlocks()
    .forEach((childBlock) => {
      blockVisitor(childBlock);
      processBlocksRecursively(childBlock, blockVisitor);
    });
}

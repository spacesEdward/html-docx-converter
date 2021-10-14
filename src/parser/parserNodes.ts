export const StructureTypes = {
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  heading4: 'Heading 4',
  orderedList: 'Ordered List',
  unorderedList: 'Unordered List',
  structure: 'Container',
} as const;

type StructureTypesObj = typeof StructureTypes;
type StructureTypesList = StructureTypesObj[keyof StructureTypesObj];

export const ParseNodeTypes = {
  structure: 'structure',
  textRun: 'textRun',
  image: 'image',
} as const;

interface ParseNodeBase {
  type: string;
  closed: boolean;
}

export interface StructureParseNode extends ParseNodeBase {
  type: typeof ParseNodeTypes.structure;
  children: ParseNode[];
  structureType: StructureTypesList;
}

export interface TextRunParseNode extends ParseNodeBase {
  type: typeof ParseNodeTypes.textRun;
  content: string;
}

export interface ImageParseNode extends ParseNodeBase {
  type: typeof ParseNodeTypes.image;
  src: string;
  data?: ArrayBuffer;
}

export type ParseNode = StructureParseNode | TextRunParseNode | ImageParseNode;

export const isStructureNode = (node: ParseNode): node is StructureParseNode => {
  return node?.type === ParseNodeTypes.structure;
}
export const isTextNode = (node: ParseNode): node is TextRunParseNode => {
  return node?.type === ParseNodeTypes.textRun;
}
export const isImageNode = (node: ParseNode): node is ImageParseNode => {
  return node?.type === ParseNodeTypes.image;
}

export const createContainerNode = (structureType: StructureTypesList): StructureParseNode => ({
  type: ParseNodeTypes.structure,
  children: [],
  structureType,
  closed: false,
})
export const createTextRunNode = (content: string = ''): TextRunParseNode => ({
  type: ParseNodeTypes.textRun,
  content,
  closed: false,
})
export const createImageNode = (src: string = ''): ImageParseNode => ({
  type: ParseNodeTypes.image,
  src,
  closed: false,
})

import {StartTag, Token} from "simple-html-tokenizer";
import {
  createContainerNode,
  createImageNode,
  createTextRunNode,
  isStructureNode,
  ParseNode,
  StructureTypes
} from "./parserNodes";


const createNode = (token: StartTag): ParseNode | null => {
  switch (token.tagName) {
    case 'h1':
      return createContainerNode(StructureTypes.heading1);
    case 'h2':
      return createContainerNode(StructureTypes.heading2);
    case 'h3':
      return createContainerNode(StructureTypes.heading3);
    case 'h4':
      return createContainerNode(StructureTypes.heading4);
    case 'p':
      return createContainerNode(StructureTypes.paragraph);
    case 'li':
    case 'div':
    case 'span':
    case 'strong':
    case 'b':
    case 'i':
    case 'em':
      return createContainerNode(StructureTypes.structure);
    case 'ul':
      return createContainerNode(StructureTypes.unorderedList);
    case 'ol':
      return createContainerNode(StructureTypes.orderedList);
    case 'img':
      console.log(token)
      return createImageNode(token.attributes.find(attr => attr[0] === 'src')?.[1]);
  }
  console.error(`Skipping node with tagName ${token.tagName}`)
  return null;
}

export default function tokenParser(tokenStream: IterableIterator<Token>, parentTag?: string): ParseNode[] {
  const nodes: ParseNode[] = [];

  let result = tokenStream.next();
  while (!result.done) {
    const token = result.value;
    const currentNode = nodes.length ? nodes[nodes.length - 1] : undefined;
    switch (token.type) {
      case 'StartTag':
        const newNode = createNode(token);
        if (newNode) {
          nodes.push(newNode)

          if (token.selfClosing) {
            newNode.closed = true;
          } else if (isStructureNode(newNode)) {
            console.log('Opening child context:', token.tagName)
            newNode.children = tokenParser(tokenStream, token.tagName);
            newNode.closed = true;
          }
        }
        break;
      case 'EndTag':
        if (token.tagName === parentTag) {
          // Closing out of a child context
          console.log('Closing child context:', parentTag)
          return nodes;
        }
        console.error(`Unexpected closing token: expected ${parentTag} received`, token);
        break;
      case 'Chars':
        const textNode = createTextRunNode(token.chars);
        nodes.push(textNode);
        break;
    }
    result = tokenStream.next();
  }
  return nodes
}

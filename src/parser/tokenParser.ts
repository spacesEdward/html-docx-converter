import {StartTag, Token} from "simple-html-tokenizer";
import {
  createContainerNode,
  createImageNode,
  createTextRunNode,
  isStructureNode,
  ParseNode,
  ParseNodeTypes,
} from "./parserNodes";
import {HeadingLevel} from "docx";

const createNode = (token: StartTag): ParseNode | null => {
  switch (token.tagName) {
    case "h1":
      return createContainerNode({
        headingLevel: HeadingLevel.HEADING_1
      });
    case "h2":
      return createContainerNode({
        headingLevel: HeadingLevel.HEADING_2
      });
    case "h3":
      return createContainerNode({
        headingLevel: HeadingLevel.HEADING_3
      });
    case "h4":
      return createContainerNode({
        headingLevel: HeadingLevel.HEADING_4
      });
    case "h5":
      return createContainerNode({
        headingLevel: HeadingLevel.HEADING_5
      });
    case "p":
      return createContainerNode({
        paragraph: true,
      });
    case "li":
    case "div":
    case "span":
      return createContainerNode();
    case "strong":
    case "b":
      return createContainerNode({
        bold: true,
      });
    case "i":
    case "em":
      return createContainerNode({
        italic: true,
      });
    case "ul":
    case "ol":
      return createContainerNode({
        list: true,
      });
    case "img":
      console.log(token);
      return createImageNode(
        token.attributes.find((attr) => attr[0] === "src")?.[1]
      );
  }
  console.error(`Skipping node with tagName ${token.tagName}`);
  return null;
};

export const pruneNode = (node: ParseNode): ParseNode[] => {
  switch (node.type) {
    case ParseNodeTypes.textRun:
      // trim empty nodes
      const trimmedContent = node.content.trim();
      if (trimmedContent.length > 0) {
        return [node];
      }
      break;
    case ParseNodeTypes.image:
      // trim images with no source
      if (node.src.length > 0) {
        return [node];
      }
      break;
    case ParseNodeTypes.structure:
      node.children = node.children.flatMap(pruneNode);
      // trim nodes with no text children
      if (node.children.length) {
        return [node]; // TODO prune structure nodes
      }
  }

  return [];
};

export default function tokenParser(
  tokenStream: IterableIterator<Token>,
  parentTag?: string
): ParseNode[] {
  const nodes: ParseNode[] = [];

  let result = tokenStream.next();
  while (!result.done) {
    const token = result.value;
    const currentNode = nodes.length ? nodes[nodes.length - 1] : undefined;
    switch (token.type) {
      case "StartTag":
        const newNode = createNode(token);
        if (newNode) {
          nodes.push(newNode);

          if (token.selfClosing) {
            newNode.closed = true;
          } else if (isStructureNode(newNode)) {
            console.log("Opening child context:", token.tagName);
            newNode.children = tokenParser(tokenStream, token.tagName);
            newNode.closed = true;
          }
        }
        break;
      case "EndTag":
        if (token.tagName === parentTag) {
          // Closing out of a child context
          console.log("Closing child context:", parentTag);
          return nodes;
        }
        console.error(
          `Unexpected closing token: expected ${parentTag} received`,
          token
        );
        break;
      case "Chars":
        const textNode = createTextRunNode(token.chars);
        nodes.push(textNode);
        break;
    }
    result = tokenStream.next();
  }
  return nodes;
}

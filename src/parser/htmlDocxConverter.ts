import {ImageRun, ISectionOptions, Paragraph, ParagraphChild, SectionType, ShadingType, TextRun,} from "docx";
import {tokenize} from "simple-html-tokenizer";
import tokenParser, {pruneNode} from "./tokenParser";
import {
  ImageParseNode,
  isImageNode,
  isStructureNode,
  ParseNode,
  ParseNodeTypes,
  StructureParseNodeAttributes,
} from "./parserNodes";
import {ImageSize, resize} from "./functions";

const toRuns = (
  node: ParseNode,
  attributes: StructureParseNodeAttributes = {}
): ParagraphChild[] => {
  switch (node.type) {
    case ParseNodeTypes.textRun:
      return [
        new TextRun({
          text: node.content,
          bold: attributes.bold,
          italics: attributes.italic,
          shading: attributes.backgroundColour ? {
            type: ShadingType.CLEAR,
            fill: attributes.backgroundColour
          } : undefined,
        }),
      ];
    case ParseNodeTypes.image:
      if (node.data) {
        const { data } = node;
        const scaled = resize(data, { width: 600, height: 600 });

        return [
          new ImageRun({
            data: data.file,
            transformation: scaled,
          }),
        ];
      }
      console.error("Attempted to convert unloaded image");
      return [];

    default:
      return node.children.flatMap((c) =>
        toRuns(c, { ...attributes, ...node.attributes })
      );
  }
};

const toParagraphs = (
  node: ParseNode,
  depth: number = -1,
  attributes: StructureParseNodeAttributes = {}
): Paragraph[] => {
  switch (node.type) {
    case ParseNodeTypes.textRun:
    case ParseNodeTypes.image:
      return [
        new Paragraph({
          children: toRuns(node, attributes),
          bullet:
            depth >= 0
              ? {
                  level: depth,
                }
              : undefined,
        }),
      ];
    default:
      if (node.attributes.headingLevel || node.attributes.paragraph) {
        return [
          new Paragraph({
            children: node.children.flatMap((c) =>
              toRuns(c, { ...attributes, ...node.attributes })
            ),
            heading: node.attributes.headingLevel,
            bullet:
              depth >= 0
                ? {
                    level: depth,
                  }
                : undefined,
          }),
        ];
      }
      if (node.attributes.list) {
        return node.children.flatMap((n) =>
          toParagraphs(n, depth + 1, { ...attributes, ...node.attributes })
        );
      }
      return node.children.flatMap((n) =>
        toParagraphs(n, depth, { ...attributes, ...node.attributes })
      );
  }
};

const findImages = (node: ParseNode): ImageParseNode[] => {
  if (isImageNode(node)) {
    return [node];
  }
  if (isStructureNode(node)) {
    return node.children.flatMap(findImages);
  }
  return [];
};

const loadImages = (parseTree: ParseNode[]) => {
  const imageNodes = parseTree.flatMap(findImages);
  // console.log('------- LOADING IMAGES --------', imageNodes);

  const promises = imageNodes.map((node) =>
    fetch(node.src)
      .then((resp) => resp.blob())
      .then((blob) =>
        Promise.all([
          blob.arrayBuffer(),
          new Promise<ImageSize>((resolve, reject) => {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(blob);
            img.onload = () => {
              resolve({
                height: img.height,
                width: img.width,
              });
            };
            img.onerror = (err) => {
              console.error("Failed to load image:", err);
              resolve({ height: 10, width: 10 });
            };
          }),
        ])
      )
      .then(([buffer, attrs]) => {
        node.data = {
          file: buffer,
          height: attrs.height,
          width: attrs.width,
        };
        return node;
      })
  );
  return Promise.all(promises).then(
    (val) =>
      // console.log('------- LOADED IMAGES --------', val);
      val
  );
};

export const parseParagraphChildren = (
  htmlString: string,
  attributes: StructureParseNodeAttributes = {}
): Promise<ParagraphChild[]> => {
  const tokens = tokenize(htmlString);

  // console.log('------- STARTING PARSE --------', tokens);
  const parseTree = tokenParser(tokens[Symbol.iterator]()).flatMap(pruneNode);
  // console.log('------- FINISHED PARSE --------', parseTree);

  return loadImages(parseTree).then(() =>
    parseTree.flatMap((node) => {
      // console.log('------- STARTING CONVERT --------', parseTree);
      const runs = toRuns(node, attributes);
      // console.log('------- FINISHED CONVERT --------', runs);
      return runs;
    })
  );
};

export const parseSectionChildren = (
  htmlString: string,
  attributes: StructureParseNodeAttributes = {}
): Promise<ISectionOptions["children"]> => {
  const tokens = tokenize(htmlString);

  // console.log('------- STARTING PARSE --------', tokens);
  const parseTree = tokenParser(tokens[Symbol.iterator]()).flatMap(pruneNode);
  // console.log('------- FINISHED PARSE --------', parseTree);

  return loadImages(parseTree).then(() =>
    parseTree.flatMap((node) => {
      // console.log('------- STARTING CONVERT --------', parseTree);
      const paragraphs = toParagraphs(node, -1, attributes);
      // console.log('------- FINISHED CONVERT --------', paragraphs);
      return paragraphs;
    })
  );
};

export const parseSection = (
  htmlString: string,
  attributes: StructureParseNodeAttributes = {}
): Promise<ISectionOptions> =>
  parseSectionChildren(htmlString, attributes).then((children) => ({
    properties: {
      type: SectionType.NEXT_PAGE,
    },
    children,
  }));

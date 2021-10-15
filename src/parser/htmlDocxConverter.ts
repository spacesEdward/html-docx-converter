import {
  Document,
  HeadingLevel,
  ImageRun,
  ISectionOptions,
  Paragraph,
  ParagraphChild,
  SectionType,
  TableOfContents,
  TextRun,
} from "docx";
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

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined;
}

interface ImageSize {
  width: number;
  height: number;
}

const toRuns = (node: ParseNode, attributes: StructureParseNodeAttributes): ParagraphChild[] => {
  switch (node.type) {
    case ParseNodeTypes.textRun:
      return [new TextRun({
        text: node.content,
        bold: attributes.bold,
        italics: attributes.italic,
      })];
    case ParseNodeTypes.image:
      const data = node.data
      if (data) {
        const scaled = resize(data, {width: 600, height: 600})

        return [
          new ImageRun({
            data: data.file,
            transformation: scaled,
          }),
        ];
      } else {
        console.error('Attempted to convert unloaded image')
        return [];
      }
    default:
      return node.children.flatMap(c => toRuns(c, {...attributes, ...node.attributes}));
  }
};

const toParagraphs = (node: ParseNode, depth: number = -1, attributes: StructureParseNodeAttributes = {}): Paragraph[] => {
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
            children: node.children.flatMap(c => toRuns(c, {...attributes, ...node.attributes})),
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
        return node.children.flatMap((n) => toParagraphs(n, depth + 1, {...attributes, ...node.attributes}));
      }
      return node.children.flatMap((n) => toParagraphs(n, depth, {...attributes, ...node.attributes}));
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

const resize = (actual: ImageSize, max: ImageSize): ImageSize => {
  const scaled = {...actual};

  if (scaled.width > max.width) {
    scaled.width = max.width;
    scaled.height = (max.width * actual.height) / actual.width;
  }
  if (scaled.height > max.height) {
    scaled.width = (max.height * actual.width) / actual.height;
    scaled.height = max.height;
  }

  return scaled
}

const loadImages = (parseTree: ParseNode[]) => {
  const imageNodes = parseTree.flatMap(findImages);

  const promises = imageNodes.map((node) =>
    fetch(node.src)
      .then((resp) => resp.blob())
      .then((blob) => {
        return Promise.all([
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
            img.onerror = () => reject("Image load error");
          }),
        ]);
      })
      .then(([buffer, attrs]) => {
        node.data = {
          file: buffer,
          height: attrs.height,
          width: attrs.width,
        };
      })
  );
  return Promise.all(promises);
};

const parseSections = (htmlString: string): Promise<ISectionOptions[]> => {
  const tokens = tokenize(htmlString);
  console.log("------- STARTING PARSE --------", {
    tokens,
  });
  const parseTree = tokenParser(tokens[Symbol.iterator]()).flatMap(pruneNode);

  return loadImages(parseTree).then(() => {
    console.log({ parseTree });

    return [
      {
        properties: {
          type: SectionType.NEXT_PAGE,
        },
        children: parseTree.flatMap((node) => {
          return toParagraphs(node);
        }),
      },
    ];
  });
};

const ToCSection = (): ISectionOptions => {
  return {
    properties: {
      type: SectionType.NEXT_PAGE,
    },
    children: [
      new Paragraph({
        text: "Table of Contents",
        heading: HeadingLevel.HEADING_1,
      }),
      new TableOfContents("Table of Contents", {
        hyperlink: true,
        headingStyleRange: "1-3",
      }),
    ],
  };
};

export default function htmlDocxConverter(htmlString: string, styles: string) {
  return parseSections(htmlString).then(
    (sections) =>
      new Document({
        externalStyles: styles,
        // styles: {
        //   default: {
        //     document: {
        //       run: {
        //         font: "Arial",
        //         // This is measured in 1/2 of a pt
        //         size: 20,
        //       },
        //       paragraph: {
        //         spacing: {
        //           // 240 is a single line, can't figure out why though. Doesn't seem to be about size
        //           line: 276,
        //           // This is measured in 1/20 of a pt
        //           after: 240,
        //         },
        //       },
        //     },
        //     title: {
        //       run: {
        //         // This is measured in 1/2 of a pt
        //         size: 72,
        //         bold: true,
        //         color: "041E42",
        //       },
        //       paragraph: {
        //         spacing: {
        //           before: 3600,
        //           line: 276,
        //           after: 120,
        //         },
        //       },
        //     },
        //     heading1: {
        //       run: {
        //         size: 40,
        //         bold: true,
        //         color: "041E42",
        //       },
        //       paragraph: {
        //         // No fine control over border, just this
        //         thematicBreak: true,
        //         spacing: {
        //           line: 276,
        //           after: 120,
        //         },
        //       },
        //       basedOn: "Normal",
        //     },
        //     listParagraph: {
        //       paragraph: {
        //         contextualSpacing: true,
        //       },
        //     },
        //   },
        // },
        sections: [ToCSection(), ...sections],
      })
  );
}

import {
  Document,
  HeadingLevel,
  ISectionOptions,
  Paragraph,
  ParagraphChild,
  SectionType,
  TableOfContents,
  TextRun,
} from 'docx';
import {tokenize} from 'simple-html-tokenizer';
import tokenParser from "./tokenParser";
import {ParseNode, ParseNodeTypes, StructureTypes} from "./parserNodes";


export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

const toRuns = (node: ParseNode): ParagraphChild[] => {
  switch (node.type) {
    case ParseNodeTypes.textRun:
      return [
        new TextRun(node.content),
      ];
    case ParseNodeTypes.image:
      return [
        // new ImageRun({
        //   data: fs.readFileSync(node.src),
        //   transformation: {
        //     width: 100,
        //     height: 100,
        //   }
        // })
      ];
    default:
      return node.children.flatMap(toRuns);
  }
}

const toParagraphs = (node: ParseNode, depth: number = -1): Paragraph[] => {
  switch (node.type) {
    case ParseNodeTypes.textRun:
    case ParseNodeTypes.image:
      return [
        new Paragraph({
          children: toRuns(node),
          bullet: depth >= 0 ? {
            level: depth
          } : undefined,
        })
      ]
    default:
      switch (node.structureType) {
        case StructureTypes.heading1:
          return [
            new Paragraph({
              children: node.children.flatMap(toRuns),
              heading: HeadingLevel.HEADING_1,
              bullet: depth >= 0 ? {
                level: depth
              } : undefined,
            })
          ]
        case StructureTypes.heading2:
          return [
            new Paragraph({
              children: node.children.flatMap(toRuns),
              heading: HeadingLevel.HEADING_2,
              bullet: depth >= 0 ? {
                level: depth
              } : undefined,
            })
          ]
        case StructureTypes.heading3:
          return [
            new Paragraph({
              children: node.children.flatMap(toRuns),
              heading: HeadingLevel.HEADING_3,
              bullet: depth >= 0 ? {
                level: depth
              } : undefined,
            })
          ]
        case StructureTypes.heading4:
          return [
            new Paragraph({
              children: node.children.flatMap(toRuns),
              heading: HeadingLevel.HEADING_4,
              bullet: depth >= 0 ? {
                level: depth
              } : undefined,
            })
          ]
        case StructureTypes.paragraph:
          return [
            new Paragraph({
              children: node.children.flatMap(toRuns),
              bullet: depth >= 0 ? {
                level: depth
              } : undefined,
            })
            ]
        case "Ordered List":
        case "Unordered List":
          return node.children.flatMap(n => toParagraphs(n, depth + 1))
        default:
          return node.children.flatMap(n => toParagraphs(n, depth))
      }
  }
}

// const convertTree = (tree: ParseNode[])

const parseSections = (htmlString: string): ISectionOptions[] => {

  const tokens = tokenize(htmlString);
  console.log('------- STARTING PARSE --------', {
    tokens,
  })
  const parseTree = tokenParser(tokens[Symbol.iterator]());

  console.log({parseTree})

  return [
    {
      properties: {
        type: SectionType.NEXT_PAGE,
      },
      children:
        parseTree.flatMap(node => {
          return toParagraphs(node)
        }),
    }
  ]
}

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
        headingStyleRange: '1-3'
      })
    ]
  }
}

export default function htmlDocxConverter(htmlString: string) {

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            // This number is halved to get final font size
            size: 20,
          },
          paragraph: {
            spacing: {
              // 240 is a single line, can't figure out why though. Doesn't seem to be about size
              line: 276,
              // This is measured in 1/20 of a pt
              after: 240,
            },
          },
        },
        title: {
          run: {
            size: 72,
            bold: true,
            color: '041E42',
          },
          paragraph: {
            spacing: {
              before: 3600,
              line: 276,
              after: 120,
            },
          },
        },
        heading1: {
          run: {
            size: 40,
            bold: true,
            color: '041E42',
          },
          paragraph: {
            // No fine control over border, just this
            thematicBreak: true,
            spacing: {
              line: 276,
              after: 120,
            },
          },
          basedOn: 'Normal',
        },
        listParagraph: {
          paragraph: {
            contextualSpacing: true,
          },
        },
      },
    },
    sections: [
        ToCSection(),
        ...parseSections(htmlString),
      ]
  });
}

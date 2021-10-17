import { Document } from 'docx';
import styles from "../styles";
import {parseSection} from "./htmlDocxConverter";

export default function DocumentCreator(content: string) {
  return parseSection(content, )
    .then(section => new Document({
      externalStyles: styles,
      sections: [section],
    }))
};

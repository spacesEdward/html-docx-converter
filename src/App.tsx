import React from 'react';
import './App.css';
import htmlContent from './content'
import htmlDocxConverter from "./parser/htmlDocxConverter";
import {Packer} from "docx";
import {saveAs} from 'file-saver';
import content from "./content";
import {stylesXml} from "./styles";

function App() {
  const handleClick = () => {
    htmlDocxConverter(htmlContent, stylesXml)
      .then(document => {
        Packer.toBlob(document).then((blob) => {
          // saveAs from FileSaver will download the file
          saveAs(blob, 'test-document.docx');
        });
      })
  }

  return (
    <div className="App">
      <h1>Doc conversion test</h1>
      <button onClick={handleClick}>generate</button>
      <div dangerouslySetInnerHTML={{__html: content}}/>
    </div>
  );
}

export default App;

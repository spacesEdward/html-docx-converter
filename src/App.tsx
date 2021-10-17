import React from 'react';
import './App.css';
import htmlContent from './content'
import content from './content'
import {Packer} from "docx";
import {saveAs} from 'file-saver';
import DocumentCreator from "./parser/DocumentCreator";

function App() {
  const handleClick = () => {
    DocumentCreator(htmlContent)
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
      <div className="content" dangerouslySetInnerHTML={{__html: content}}/>
    </div>
  );
}

export default App;

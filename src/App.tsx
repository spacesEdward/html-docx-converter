import React from 'react';
import './App.css';
import htmlContent from './content'
import htmlDocxConverter from "./parser/htmlDocxConverter";
import {Packer} from "docx";
import {saveAs} from 'file-saver';

function App() {
  const handleClick = () => {
    const document = htmlDocxConverter(htmlContent);
    Packer.toBlob(document).then((blob) => {
      // saveAs from FileSaver will download the file
      saveAs(blob, 'test-document.docx');
    });
  }

  return (
    <div className="App">
      <h1>Doc conversion test</h1>
      <button onClick={handleClick}>generate</button>
    </div>
  );
}

export default App;

/* Exact reviewed text, a portable font, and automatic page breaks for ATS uploads. */
(()=>{'use strict';let fontPromise;
 async function pdf(text){if(!String(text||'').trim())throw new Error('A prepared document is empty.');if(!window.jspdf?.jsPDF)throw new Error('PDF tools did not load. Reload before saving application documents.');
  fontPromise ||= fetch('/vendor/DejaVuSans.ttf').then(r=>{if(!r.ok)throw new Error('Document font could not load. Retry before applying.');return r.arrayBuffer();}).catch(e=>{fontPromise=null;throw e;});
  const font=new Uint8Array(await fontPromise);let binary='';for(let i=0;i<font.length;i+=8192)binary+=String.fromCharCode(...font.subarray(i,i+8192));
  const doc=new window.jspdf.jsPDF({unit:'pt',format:'a4',compress:true});doc.addFileToVFS('ApplyFlowSans.ttf',btoa(binary));doc.addFont('ApplyFlowSans.ttf','ApplyFlowSans','normal');doc.setFont('ApplyFlowSans');doc.setFontSize(10.5);
  const source=String(text).replace(/\r\n?/g,'\n').replace(/\t/g,'    ');const face=doc.getFont().metadata;
  for(const char of source){if(!/\s/u.test(char)&&(!face.characterToGlyph||face.characterToGlyph(char.codePointAt(0))===0))throw new Error('This document contains a character the PDF font cannot display. Upload a reviewed PDF manually.');}
  const lines=doc.splitTextToSize(source,499);let y=54;for(const line of lines){if(y>786){doc.addPage();y=54;}doc.text(line,48,y);y+=15;}
  return new Blob([doc.output('arraybuffer')],{type:'application/pdf'});
 }
 window.ApplyFlowPdf={fromText:pdf};
})();

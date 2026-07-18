// Using pdf-parse because it works natively in Node.js environments 
// without the Webpack/Turbopack worker bundling issues that plague pdfjs-dist.
// @ts-ignore: Bypassing the buggy index.js file which tries to read a test PDF
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export interface DocumentChunk {
  pageNumber: number;
  text: string;
}

/**
 * Extracts text from a PDF buffer and splits it into manageable chunks, preserving page numbers.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  
  // pdf-parse allows overriding the default pagerender to extract page by page
  // We'll append a unique delimiter to easily split the text back into pages.
  const PAGE_DELIMITER = "[[PAGE_SEPARATOR_12345]]";
  
  const renderPage = async function(pageData: any) {
    const renderOptions = {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    };
    const textContent = await pageData.getTextContent(renderOptions);
    let lastY, text = "";
    for (const item of textContent.items) {
      if (lastY === item.transform[5] || !lastY) {
        text += item.str;
      } else {
        text += "\n" + item.str;
      }
      lastY = item.transform[5];
    }
    // Append the delimiter at the end of each page
    return text.replace(/\s+/g, " ").trim() + PAGE_DELIMITER;
  };

  const data = await pdfParse(buffer, { pagerender: renderPage });
  
  console.log(`\n--- [AUDIT START: PDF PARSER] ---`);
  console.log(`[AUDIT] pdf-parse completed. Raw text length: ${data.text?.length || 0} characters.`);
  if (!data.text || data.text.trim().length === 0) {
    throw new Error("[AUDIT ERROR] pdf-parse returned an empty string. The PDF buffer was parsed, but no text was extracted. Are you sure this is a text-based PDF?");
  }
  console.log(`[AUDIT] First 300 chars of raw extracted text:\n"${data.text.substring(0, 300).replace(/\n/g, "\\n")}"`);
  
  // Split the entire text by our delimiter to get an array of pages
  const pages = data.text.split(PAGE_DELIMITER);
  console.log(`[AUDIT] Split into ${pages.length} pages using delimiter.`);

  // Iterate over each page (ignoring any trailing empty strings from the split)
  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i].trim();
    if (pageText.length > 0) {
      const pageNumber = i + 1;
      
      // Chunking strategy: split by ~1000 chars, respecting sentence boundaries
      const pageChunks = splitTextIntoChunks(pageText, 1000);
      pageChunks.forEach(text => {
        chunks.push({
          pageNumber: pageNumber,
          text: text
        });
      });
    }
  }

  return chunks;
}

function splitTextIntoChunks(text: string, maxChunkSize: number, overlapSize: number = 150): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  // Naive sentence boundary detection
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    if ((currentChunk.length + sentence.length) > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Calculate overlap: back-track to grab the last few sentences
      let overlap = "";
      let backIndex = i - 1;
      while (backIndex >= 0 && (overlap.length + sentences[backIndex].length) <= overlapSize) {
        overlap = sentences[backIndex] + " " + overlap;
        backIndex--;
      }
      currentChunk = overlap;
    }
    currentChunk += sentence + " ";
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

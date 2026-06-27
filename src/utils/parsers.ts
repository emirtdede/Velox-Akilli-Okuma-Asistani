/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mammoth from 'mammoth';
import JSZip from 'jszip';

// Loads PDF.js from Cloudflare CDN to avoid giant bundle issues and work natively in-browser
const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.id = 'pdfjs-script';
    script.async = true;

    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      // Configure CDN worker for high performance background parsing
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjs);
    };

    script.onerror = () => {
      reject(new Error('PDF kütüphanesi yüklenirken hata oluştu. İnternet bağlantınızı kontrol edin.'));
    };

    document.head.appendChild(script);
  });
};

/**
 * Extracts raw textual content from an uploaded PDF file's ArrayBuffer
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer, onProgress?: (percent: number) => void): Promise<string> {
  try {
    const pdfjsLib = await loadPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let totalText = '';
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
        
      totalText += pageText + '\n\n';
      
      if (onProgress) {
        onProgress(Math.round((pageNum / numPages) * 100));
      }
    }

    return totalText.trim();
  } catch (error: any) {
    console.error('PDF extracting failed:', error);
    throw new Error('PDF dosyası okunamadı: ' + (error.message || 'Bilinmeyen Hata'));
  }
}

/**
 * Extracts raw text from an uploaded DOCX file's ArrayBuffer using Mammoth
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error: any) {
    console.error('DOCX extracting failed:', error);
    throw new Error('Word (.docx) dosyası okunamadı: ' + (error.message || 'Geçersiz format'));
  }
}

/**
 * Determines and splits strings into words, cleaning extra spacing
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  // Split on spaces but keep punctuation attached to words for rich parsing
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

/**
 * Utility to calculate ORP (Optimal Recognition Point) for a single word
 * Returns the index of the focal character, plus prefix, focus letter, and suffix
 */
export interface OrpPart {
  prefix: string;
  focus: string;
  suffix: string;
  focusIndex: number;
}

export function calculateOrp(word: string): OrpPart {
  if (!word || word.trim().length === 0) {
    return { prefix: '', focus: '', suffix: '', focusIndex: 0 };
  }

  // Handle punctuation at end of word to exclude it from focal calculations
  let cleanWord = word;
  let suffixPunctuation = '';
  
  // Regex to extract trailing punctuation
  const match = word.match(/^([a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+)([^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]*)$/);
  if (match) {
    cleanWord = match[1];
    suffixPunctuation = match[2];
  }

  const len = cleanWord.length;
  let focusIndex = 0;

  if (len <= 1) {
    focusIndex = 0;
  } else if (len <= 5) {
    focusIndex = 1; // 2nd letter
  } else if (len <= 9) {
    focusIndex = 2; // 3rd letter
  } else if (len <= 13) {
    focusIndex = 3; // 4th letter
  } else {
    focusIndex = 4; // 5th letter
  }

  const prefix = cleanWord.substring(0, focusIndex);
  const focus = cleanWord.charAt(focusIndex);
  const suffix = cleanWord.substring(focusIndex + 1) + suffixPunctuation;

  return {
    prefix,
    focus,
    suffix,
    focusIndex
  };
}

/**
 * Formats a word group into Bionic Reading markup (HTML elements)
 */
export function formatBionicWord(word: string): { bold: string; rest: string } {
  // Strips trailing non-alphanumeric punctuation
  const match = word.match(/^([a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+)([^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]*)$/);
  if (!match) return { bold: word, rest: '' };

  const clean = match[1];
  const punct = match[2];
  
  const len = clean.length;
  if (len <= 3) {
    // Bold the whole short word
    return { bold: clean, rest: punct };
  }
  
  // Bold about 40-50%
  const boldLen = Math.ceil(len * 0.4);
  const bold = clean.substring(0, boldLen);
  const rest = clean.substring(boldLen) + punct;
  
  return { bold, rest };
}

/**
 * Extracts raw text content from an uploaded EPUB file's ArrayBuffer using client-side JSZip
 */
export async function extractTextFromEpub(arrayBuffer: ArrayBuffer, onProgress?: (percent: number) => void): Promise<string> {
  try {
    if (onProgress) onProgress(10);
    const zip = await JSZip.loadAsync(arrayBuffer);
    if (onProgress) onProgress(30);

    // 1. Read container.xml to find the OPF file path
    const containerXmlFile = zip.file('META-INF/container.xml');
    if (!containerXmlFile) {
      throw new Error('container.xml bulunamadı. Geçersiz EPUB dosyası.');
    }
    const containerXmlText = await containerXmlFile.async('text');
    const opfPathMatch = containerXmlText.match(/full-path="([^"]+)"/);
    if (!opfPathMatch) {
      throw new Error('OPF dosya yolu container.xml içinde bulunamadı.');
    }
    const opfPath = opfPathMatch[1];
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // 2. Read OPF file
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`OPF dosyası bulunamadı: ${opfPath}`);
    }
    const opfText = await opfFile.async('text');

    if (onProgress) onProgress(50);

    // 3. Find spine itemrefs in order
    const spineMatches = [...opfText.matchAll(/<itemref\s+[^>]*idref=["']([^"']+)["']/g)];
    const idrefs = spineMatches.map(m => m[1]);

    // 4. Find manifest items to map ID to href
    const manifestItems: Record<string, string> = {};
    const itemMatches = [...opfText.matchAll(/<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["']/g)];
    const itemMatchesAlt = [...opfText.matchAll(/<item\s+[^>]*href=["']([^"']+)["'][^>]*id=["']([^"']+)["']/g)];
    
    itemMatches.forEach(m => {
      manifestItems[m[1]] = m[2];
    });
    itemMatchesAlt.forEach(m => {
      manifestItems[m[2]] = m[1];
    });

    if (onProgress) onProgress(70);

    // 5. Read the XHTML/HTML files in spine order
    let extractedText = '';
    let processedHtmlFiles = 0;
    const totalHtmlFiles = idrefs.length;

    for (const idref of idrefs) {
      const relHref = manifestItems[idref];
      if (!relHref) continue;

      // Decode URI components
      const decodedHref = decodeURIComponent(relHref);
      const fullHref = opfDir + decodedHref;

      const htmlFile = zip.file(fullHref) || zip.file(fullHref.replace(/^\//, ''));
      if (htmlFile) {
        const rawHtml = await htmlFile.async('text');
        
        // Strip tags and decode entities
        const docText = rawHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        extractedText += docText + '\n\n';
      }
      processedHtmlFiles++;
      if (onProgress && totalHtmlFiles > 0) {
        onProgress(Math.round(70 + (processedHtmlFiles / totalHtmlFiles) * 30));
      }
    }

    // Secondary fallback check - if empty, read all html/xhtml files in the zip directory
    if (extractedText.trim().length === 0) {
      const allFiles = Object.keys(zip.files);
      const htmlFileNames = allFiles.filter(name => name.endsWith('.html') || name.endsWith('.xhtml') || name.endsWith('.htm'));
      
      for (const name of htmlFileNames) {
        const file = zip.file(name);
        if (file) {
          const raw = await file.async('text');
          const clean = raw
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
          extractedText += clean + '\n\n';
        }
      }
    }

    return extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

  } catch (error: any) {
    console.error('EPUB extract failed:', error);
    throw new Error('EPUB dosyası ayrıştırılamadı: ' + (error.message || 'Bilinmeyen Hata'));
  }
}


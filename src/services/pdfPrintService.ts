import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { buildWhatsAppUrl } from '../utils/appUrls';
import { openAnchorLinkSafely } from '../utils/complaintWhatsApp';

export type PaperSize = 'A4' | 'Legal' | 'Letter' | 'A5' | 'Custom';
export type PaperOrientation = 'portrait' | 'landscape';
export type PrintColorMode =
  | 'color'
  | 'grayscale'
  | 'royal_blue'
  | 'emerald'
  | 'maroon'
  | 'amber_gold'
  | 'custom';

export interface PrintPagePreferences {
  size: PaperSize;
  customWidthMm: number;
  customHeightMm: number;
  orientation: PaperOrientation;
  scalePercent: number; // 50 to 120
  marginMm: number; // 2 to 25
  colorMode: PrintColorMode;
  customAccentColor: string;
  showHeader: boolean;
  showLogo: boolean;
  showSummary: boolean;
  showSignatures: boolean;
  fontScalePercent: number; // 75 to 135
}

export interface PaperSpec {
  id: PaperSize;
  label: string;
  shortLabel: string;
  widthMm: number;
  heightMm: number;
}

export interface ColorThemeSpec {
  id: PrintColorMode;
  label: string;
  accentHex: string;
  tintBgHex: string;
  headerBgHex: string;
  borderHex: string;
}

export const COLOR_THEMES: Record<PrintColorMode, ColorThemeSpec> = {
  color: {
    id: 'color',
    label: 'মূল রঙিন',
    accentHex: '#047857',
    tintBgHex: '#ecfdf5',
    headerBgHex: '#f1f5f9',
    borderHex: '#cbd5e1'
  },
  grayscale: {
    id: 'grayscale',
    label: 'সাদা-কালো (B&W)',
    accentHex: '#0f172a',
    tintBgHex: '#f8fafc',
    headerBgHex: '#e2e8f0',
    borderHex: '#334155'
  },
  royal_blue: {
    id: 'royal_blue',
    label: 'অফিসিয়াল নীল',
    accentHex: '#1d4ed8',
    tintBgHex: '#eff6ff',
    headerBgHex: '#dbeafe',
    borderHex: '#93c5fd'
  },
  emerald: {
    id: 'emerald',
    label: 'গাঢ় সবুজ',
    accentHex: '#047857',
    tintBgHex: '#ecfdf5',
    headerBgHex: '#d1fae5',
    borderHex: '#6ee7b7'
  },
  maroon: {
    id: 'maroon',
    label: 'রাজকীয় মেরুন',
    accentHex: '#9f1239',
    tintBgHex: '#fff1f2',
    headerBgHex: '#ffe4e6',
    borderHex: '#fda4af'
  },
  amber_gold: {
    id: 'amber_gold',
    label: 'গোল্ডেন অ্যাম্বার',
    accentHex: '#b45309',
    tintBgHex: '#fffbeb',
    headerBgHex: '#fef3c7',
    borderHex: '#fcd34d'
  },
  custom: {
    id: 'custom',
    label: 'নিজের কালার',
    accentHex: '#4f46e5',
    tintBgHex: '#eef2ff',
    headerBgHex: '#e0e7ff',
    borderHex: '#a5b4fc'
  }
};

export const PAPER_SPECS: Record<PaperSize, PaperSpec> = {
  A4: {
    id: 'A4',
    label: 'A4 স্ট্যান্ডার্ড (২১০ × ২৯৭ মিমি)',
    shortLabel: 'A4',
    widthMm: 210,
    heightMm: 297
  },
  Legal: {
    id: 'Legal',
    label: 'Legal দলিল সাইজ (২১৬ × ৩৫৬ মিমি)',
    shortLabel: 'Legal',
    widthMm: 215.9,
    heightMm: 355.6
  },
  Letter: {
    id: 'Letter',
    label: 'Letter সাইজ (২১৬ × ২৭৯ মিমি)',
    shortLabel: 'Letter',
    widthMm: 215.9,
    heightMm: 279.4
  },
  A5: {
    id: 'A5',
    label: 'A5 রসিদ / মিনি (১৪৮ × ২১০ মিমি)',
    shortLabel: 'A5',
    widthMm: 148,
    heightMm: 210
  },
  Custom: {
    id: 'Custom',
    label: 'কাস্টম সাইজ (নিজের মাপ মিমি)',
    shortLabel: 'Custom',
    widthMm: 210,
    heightMm: 297
  }
};

const PRINT_PREFS_STORAGE_KEY = 'dip_bhola_print_prefs_v2';
const PRINT_PRESETS_STORAGE_KEY = 'dip_bhola_print_presets_v1';
const SAVED_PRINTS_META_KEY = 'dip_bhola_saved_prints_meta_v1';
const SAVED_PRINTS_IDB_NAME = 'dip_bhola_saved_prints_db';
const SAVED_PRINTS_STORE = 'documents';

export const DEFAULT_PRINT_PREFS: PrintPagePreferences = {
  size: 'A4',
  customWidthMm: 210,
  customHeightMm: 297,
  orientation: 'portrait',
  scalePercent: 100,
  marginMm: 8,
  colorMode: 'color',
  customAccentColor: '#047857',
  showHeader: true,
  showLogo: true,
  showSummary: true,
  showSignatures: true,
  fontScalePercent: 100
};

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function getSavedPrintPreferences(): PrintPagePreferences {
  try {
    const raw = localStorage.getItem(PRINT_PREFS_STORAGE_KEY) || localStorage.getItem('dip_bhola_print_prefs_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        size: PAPER_SPECS[parsed.size as PaperSize] ? parsed.size : 'A4',
        customWidthMm: clampNumber(parsed.customWidthMm, 58, 450, 210),
        customHeightMm: clampNumber(parsed.customHeightMm, 80, 650, 297),
        orientation: parsed.orientation === 'landscape' ? 'landscape' : 'portrait',
        scalePercent: clampNumber(parsed.scalePercent, 50, 120, 100),
        marginMm: clampNumber(parsed.marginMm, 2, 25, 8),
        colorMode: COLOR_THEMES[parsed.colorMode as PrintColorMode] ? parsed.colorMode : 'color',
        customAccentColor:
          typeof parsed.customAccentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.customAccentColor)
            ? parsed.customAccentColor
            : '#047857',
        showHeader: parsed.showHeader !== false,
        showLogo: parsed.showLogo !== false,
        showSummary: parsed.showSummary !== false,
        showSignatures: parsed.showSignatures !== false,
        fontScalePercent: clampNumber(parsed.fontScalePercent, 75, 135, 100)
      };
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_PRINT_PREFS };
}

export function savePrintPreferences(prefs: PrintPagePreferences): void {
  try {
    localStorage.setItem(PRINT_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export interface PrintPreset {
  id: string;
  name: string;
  prefs: PrintPagePreferences;
  createdAt: string;
}

export function getSavedPrintPresets(): PrintPreset[] {
  try {
    const raw = localStorage.getItem(PRINT_PRESETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function savePrintPreset(name: string, prefs: PrintPagePreferences): PrintPreset[] {
  const existing = getSavedPrintPresets();
  const next: PrintPreset = {
    id: `preset-${Date.now()}`,
    name: name.trim() || `${prefs.size} প্রিসেট`,
    prefs: { ...prefs },
    createdAt: new Date().toISOString()
  };
  const updated = [next, ...existing].slice(0, 15);
  try {
    localStorage.setItem(PRINT_PRESETS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function deletePrintPreset(id: string): PrintPreset[] {
  const updated = getSavedPrintPresets().filter((p) => p.id !== id);
  try {
    localStorage.setItem(PRINT_PRESETS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function resolveAccentColors(
  colorMode: PrintColorMode,
  customAccentColor: string
): {
  accentHex: string;
  softTintHex: string;
  tableHeaderBgHex: string;
  borderHex: string;
  isGrayscale: boolean;
} {
  if (colorMode === 'custom') {
    const hex = /^#[0-9a-fA-F]{6}$/.test(customAccentColor) ? customAccentColor : '#4f46e5';
    return {
      accentHex: hex,
      softTintHex: `${hex}14`,
      tableHeaderBgHex: `${hex}22`,
      borderHex: `${hex}66`,
      isGrayscale: false
    };
  }
  const spec = COLOR_THEMES[colorMode] || COLOR_THEMES.color;
  return {
    accentHex: spec.accentHex,
    softTintHex: spec.tintBgHex,
    tableHeaderBgHex: spec.headerBgHex,
    borderHex: spec.borderHex,
    isGrayscale: colorMode === 'grayscale'
  };
}

export interface PrintVisualOptions {
  showHeader?: boolean;
  showLogo?: boolean;
  showSummary?: boolean;
  showSignatures?: boolean;
}

/**
 * Generates scoped CSS rules for `#print-studio-capture-surface` so any selected
 * color theme, grayscale mode, or toggled print section renders uniformly in
 * Preview, Print, and PDF.
 */
export function buildScopedPrintThemeCss(
  colorMode: PrintColorMode,
  customAccentColor: string,
  visualOptions?: PrintVisualOptions
): string {
  const sectionHideRules = [
    visualOptions?.showHeader === false
      ? `#print-studio-capture-surface [data-print-section="header"] { display: none !important; }`
      : '',
    visualOptions?.showLogo === false
      ? `#print-studio-capture-surface [data-print-section="logo"] { display: none !important; }`
      : '',
    visualOptions?.showSummary === false
      ? `#print-studio-capture-surface [data-print-section="summary"] { display: none !important; }`
      : '',
    visualOptions?.showSignatures === false
      ? `#print-studio-capture-surface [data-print-section="signatures"] { display: none !important; }`
      : ''
  ]
    .filter(Boolean)
    .join('\n');

  if (colorMode === 'color') return sectionHideRules;

  const palette = resolveAccentColors(colorMode, customAccentColor);

  if (palette.isGrayscale) {
    return `
      ${sectionHideRules}
      #print-studio-capture-surface {
        filter: grayscale(100%) contrast(1.08);
        color: #000000 !important;
      }
      #print-studio-capture-surface * {
        color: #0f172a !important;
        border-color: #334155 !important;
      }
      #print-studio-capture-surface thead tr,
      #print-studio-capture-surface tfoot tr {
        background-color: #e2e8f0 !important;
      }
      #print-studio-capture-surface .print-theme-accent-bar {
        background-color: #0f172a !important;
      }
    `;
  }

  return `
    ${sectionHideRules}
    #print-studio-capture-surface .print-theme-accent-bar {
      background-color: ${palette.accentHex} !important;
    }
    #print-studio-capture-surface h1,
    #print-studio-capture-surface h2,
    #print-studio-capture-surface h3 {
      color: ${palette.accentHex} !important;
    }
    #print-studio-capture-surface thead tr {
      background-color: ${palette.tableHeaderBgHex} !important;
      color: #0f172a !important;
    }
    #print-studio-capture-surface th,
    #print-studio-capture-surface td,
    #print-studio-capture-surface table {
      border-color: ${palette.borderHex} !important;
    }
    #print-studio-capture-surface .print-theme-tint {
      background-color: ${palette.softTintHex} !important;
      border-color: ${palette.borderHex} !important;
    }
  `;
}

/**
 * Returns paper pixel width at 96dpi for preview and PDF rasterization.
 */
export function getPaperPixelDimensions(
  size: PaperSize,
  orientation: PaperOrientation,
  customWidthMm = 210,
  customHeightMm = 297
): { widthPx: number; heightPx: number; widthMm: number; heightMm: number } {
  const baseW =
    size === 'Custom'
      ? clampNumber(customWidthMm, 58, 450, 210)
      : (PAPER_SPECS[size] || PAPER_SPECS.A4).widthMm;
  const baseH =
    size === 'Custom'
      ? clampNumber(customHeightMm, 80, 650, 297)
      : (PAPER_SPECS[size] || PAPER_SPECS.A4).heightMm;

  const widthMm = orientation === 'portrait' ? baseW : baseH;
  const heightMm = orientation === 'portrait' ? baseH : baseW;
  // 1mm = 3.7795275591 px at 96 DPI
  const widthPx = Math.round(widthMm * 3.7795275591);
  const heightPx = Math.round(heightMm * 3.7795275591);
  return { widthPx, heightPx, widthMm, heightMm };
}

/**
 * Dynamically updates the browser `@page` rule with explicit millimeter dimensions
 * so Print / Android PrintSpooler always receives the exact chosen size & margin.
 */
export function applyDynamicPrintPageRule(
  size: PaperSize = 'A4',
  orientation: PaperOrientation = 'portrait',
  marginMm = 8,
  customWidthMm = 210,
  customHeightMm = 297
): void {
  if (typeof document === 'undefined') return;
  const styleId = 'dip-dynamic-page-style';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const { widthMm, heightMm } = getPaperPixelDimensions(
    size,
    orientation,
    customWidthMm,
    customHeightMm
  );

  const explicitMm = `${widthMm}mm ${heightMm}mm`;

  styleEl.textContent = `
    @media print {
      @page {
        size: ${explicitMm};
        margin: ${marginMm}mm;
      }
    }
  `;
}

export interface GeneratedPdfResult {
  blob: Blob;
  file: File;
  blobUrl: string;
  fileName: string;
  pageCount: number;
}

function applyCanvasGrayscaleContrast(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Slight contrast curve so grey text stays crisp black on white paper
    const adjusted = lum > 235 ? 255 : lum < 45 ? 0 : Math.min(255, Math.max(0, (lum - 128) * 1.15 + 128));
    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Renders a live printable DOM element into a multi-page crisp PDF file
 * supporting Bengali Unicode ligatures, Tailwind v4 oklch colors, color themes,
 * true B&W grayscale conversion, and custom/standard page sizes.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  options: {
    fileName: string;
    size: PaperSize;
    orientation: PaperOrientation;
    marginMm?: number;
    scalePercent?: number;
    customWidthMm?: number;
    customHeightMm?: number;
    colorMode?: PrintColorMode;
    customAccentColor?: string;
    visualOptions?: PrintVisualOptions;
  }
): Promise<GeneratedPdfResult> {
  const {
    fileName,
    size,
    orientation,
    marginMm = 8,
    scalePercent = 100,
    customWidthMm = 210,
    customHeightMm = 297,
    colorMode = 'color',
    customAccentColor = '#047857',
    visualOptions
  } = options;

  const { widthMm, heightMm } = getPaperPixelDimensions(
    size,
    orientation,
    customWidthMm,
    customHeightMm
  );

  // Wait briefly for fonts if browser supports document.fonts
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as any).fonts.ready;
    } catch {
      // ignore
    }
  }

  const themeCss = buildScopedPrintThemeCss(colorMode, customAccentColor, visualOptions);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    onclone: (clonedDoc) => {
      clonedDoc.documentElement.classList.remove('dark');
      const clonedEl = clonedDoc.getElementById(element.id);
      if (clonedEl) {
        clonedEl.style.transform = 'none';
        clonedEl.style.backgroundColor = '#ffffff';
        clonedEl.style.color = '#0f172a';
        clonedEl.style.overflow = 'visible';
        clonedEl.style.letterSpacing = '0px';
      }
      const styleFix = clonedDoc.createElement('style');
      styleFix.textContent = `
        * { letter-spacing: 0 !important; }
        .print\\:hidden { display: none !important; }
        .overflow-x-auto, .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
        table { width: 100% !important; max-width: 100% !important; }
        th, td { white-space: normal !important; word-break: break-word !important; }
        ${themeCss}
      `;
      clonedDoc.head.appendChild(styleFix);
    }
  });

  if (colorMode === 'grayscale') {
    applyCanvasGrayscaleContrast(canvas);
  }

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true
  });

  const usableWidthMm = Math.max(
    40,
    (widthMm - marginMm * 2) * (Math.min(120, Math.max(50, scalePercent)) / 100)
  );
  const clampedUsableWidthMm = Math.min(widthMm - marginMm * 2, usableWidthMm);
  const usableHeightMm = Math.max(40, heightMm - marginMm * 2 - 5);
  const offsetX = marginMm + Math.max(0, (widthMm - marginMm * 2 - clampedUsableWidthMm) / 2);

  const pxPerMm = canvas.width / clampedUsableWidthMm;
  const pageCanvasHeightPx = Math.floor(usableHeightMm * pxPerMm);

  let yOffsetPx = 0;
  let pageIndex = 0;
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageCanvasHeightPx));
  const sizeBadge =
    size === 'Custom' ? `${Math.round(widthMm)}x${Math.round(heightMm)}mm` : size;

  while (yOffsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageCanvasHeightPx, canvas.height - yOffsetPx);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;

    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        yOffsetPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );
    }

    const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
    const sliceHeightMm = sliceHeightPx / pxPerMm;

    if (pageIndex > 0) {
      pdf.addPage([widthMm, heightMm], orientation);
    }

    pdf.addImage(
      sliceImgData,
      'JPEG',
      offsetX,
      marginMm,
      clampedUsableWidthMm,
      sliceHeightMm,
      undefined,
      'FAST'
    );

    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `DIP BHOLA NETWORK  |  ${sizeBadge} (${orientation === 'portrait' ? 'Portrait' : 'Landscape'})  |  Page ${pageIndex + 1} of ${totalPages}`,
      widthMm / 2,
      heightMm - 4,
      { align: 'center' }
    );

    yOffsetPx += sliceHeightPx;
    pageIndex += 1;
  }

  const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = pdf.output('blob');
  const file = new File([blob], cleanName, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  return {
    blob,
    file,
    blobUrl,
    fileName: cleanName,
    pageCount: totalPages
  };
}

/* ═══════════════════════════════════════════════════════════════ */
/* SAVED PRINT ARCHIVE (Save documents with Size + Color for later)*/
/* ═══════════════════════════════════════════════════════════════ */

export interface SavedPrintDocument {
  id: string;
  title: string;
  fileNamePrefix: string;
  summaryText: string;
  htmlSnapshot: string;
  prefs: PrintPagePreferences;
  savedAt: string;
}

function openSavedPrintsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(SAVED_PRINTS_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAVED_PRINTS_STORE)) {
        db.createObjectStore(SAVED_PRINTS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IDB'));
  });
}

export async function listSavedPrintDocuments(): Promise<SavedPrintDocument[]> {
  try {
    const db = await openSavedPrintsDb();
    return await new Promise<SavedPrintDocument[]>((resolve) => {
      const tx = db.transaction(SAVED_PRINTS_STORE, 'readonly');
      const store = tx.objectStore(SAVED_PRINTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as SavedPrintDocument[]) : [];
        rows.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
        resolve(rows);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    try {
      const raw = localStorage.getItem(SAVED_PRINTS_META_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }
}

export async function savePrintDocumentForLater(docData: {
  title: string;
  fileNamePrefix: string;
  summaryText: string;
  htmlSnapshot: string;
  prefs: PrintPagePreferences;
}): Promise<SavedPrintDocument> {
  const docRecord: SavedPrintDocument = {
    id: `print-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: docData.title,
    fileNamePrefix: docData.fileNamePrefix,
    summaryText: docData.summaryText,
    htmlSnapshot: docData.htmlSnapshot,
    prefs: { ...docData.prefs },
    savedAt: new Date().toISOString()
  };

  try {
    const db = await openSavedPrintsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SAVED_PRINTS_STORE, 'readwrite');
      tx.objectStore(SAVED_PRINTS_STORE).put(docRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage (trimmed to latest 8 docs)
    const existing = await listSavedPrintDocuments();
    const updated = [docRecord, ...existing].slice(0, 8);
    try {
      localStorage.setItem(SAVED_PRINTS_META_KEY, JSON.stringify(updated));
    } catch {
      // ignore quota overflow
    }
  }
  return docRecord;
}

export async function deleteSavedPrintDocument(id: string): Promise<void> {
  try {
    const db = await openSavedPrintsDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(SAVED_PRINTS_STORE, 'readwrite');
      tx.objectStore(SAVED_PRINTS_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    try {
      const existing = await listSavedPrintDocuments();
      localStorage.setItem(
        SAVED_PRINTS_META_KEY,
        JSON.stringify(existing.filter((d) => d.id !== id))
      );
    } catch {
      // ignore
    }
  }
}

export function triggerPdfDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function sharePdfFileNatively(
  file: File,
  title: string,
  text: string
): Promise<'shared' | 'unsupported' | 'cancelled'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  try {
    if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
      return 'unsupported';
    }
    await navigator.share({
      files: [file],
      title,
      text
    });
    return 'shared';
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

export function openWhatsAppSummaryMessage(summaryText: string, personalPhone?: string): void {
  const url = buildWhatsAppUrl(summaryText, personalPhone);
  openAnchorLinkSafely(url);
}

export function openGmailComposeSummary(
  subject: string,
  body: string,
  recipientEmail?: string
): void {
  const cleanEmail = (recipientEmail || '').trim();
  const mailtoUrl = `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  openAnchorLinkSafely(mailtoUrl);
}

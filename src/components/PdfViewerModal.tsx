import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker safely
if (typeof window !== 'undefined') {
  try {
    const version = (pdfjsLib as any).version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.debug('PDF worker config notice:', e);
  }
}

interface PdfViewerModalProps {
  url: string;
  title: string;
  filename: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  url,
  title,
  filename,
  onClose,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);

  // 1. Fetch & Load PDF Document into memory
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setCurrentPage(1);

    async function loadPdf() {
      try {
        let pdfData: Uint8Array | string = url;

        // If URL is base64 data URI
        if (typeof url === 'string' && url.startsWith('data:application/pdf;base64,')) {
          const rawBase64 = url.split(',')[1];
          const binaryStr = atob(rawBase64);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          pdfData = bytes;
        } else {
          // Fetch as ArrayBuffer to bypass any cross-origin framing or mime restrictions
          try {
            const res = await fetch(url);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              if (buf && buf.byteLength > 0) {
                pdfData = new Uint8Array(buf);
              }
            }
          } catch (fetchErr) {
            console.debug('Direct fetch failed, falling back to URL source:', fetchErr);
            pdfData = url;
          }
        }

        const loadingTask = pdfjsLib.getDocument(
          typeof pdfData === 'string'
            ? { url: pdfData, withCredentials: false }
            : { data: pdfData }
        );

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages || 1);
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('PDF.js document loading error:', err);
        setErrorMsg('Unable to render document directly. Please check that the file is a valid PDF.');
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [url]);

  // 2. Render Current Page onto Canvas
  useEffect(() => {
    if (!pdfDocRef.current || numPages === 0) return;

    let isCancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Cancel previous render task if still in flight
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.debug('Page render notice:', err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [currentPage, scale, numPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(numPages, prev + 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.5, prev + 0.2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.6, prev - 0.2));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full h-[94vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Document Title & File Details */}
          <div className="flex items-center space-x-3 min-w-0 max-w-xs sm:max-w-md">
            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 truncate">
              <div className="text-sm font-bold text-white font-mono-digits truncate">
                {title}
              </div>
              <div className="text-xs font-mono-digits text-zinc-400 truncate">
                {filename}
              </div>
            </div>
          </div>

          {/* Center: Pagination & Zoom Controls */}
          <div className="flex items-center space-x-1 sm:space-x-3 bg-zinc-950/80 border border-zinc-800 rounded-xl px-2.5 py-1">
            {/* Page navigation */}
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={handlePrevPage}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono-digits text-zinc-300 px-1 select-none">
              {loading ? (
                'Loading...'
              ) : (
                <>
                  <span className="font-bold text-white">{currentPage}</span> / {numPages}
                </>
              )}
            </span>

            <button
              type="button"
              disabled={currentPage >= numPages || loading}
              onClick={handleNextPage}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {/* Zoom controls */}
            <button
              type="button"
              disabled={loading || scale <= 0.6}
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-mono-digits text-zinc-400 w-10 text-center select-none">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              disabled={loading || scale >= 2.5}
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={url}
              download={filename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono-digits text-zinc-200 transition-colors cursor-pointer"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Canvas Viewport Area */}
        <div className="flex-1 w-full bg-zinc-900/60 overflow-auto flex flex-col items-center justify-start p-4 select-none">
          {loading && (
            <div className="m-auto flex flex-col items-center justify-center space-y-3 py-16 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff3b30]" />
              <p className="text-xs font-mono-digits">Rendering PDF document directly...</p>
            </div>
          )}

          {errorMsg && (
            <div className="m-auto flex flex-col items-center justify-center space-y-3 py-16 text-zinc-400 text-center max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <p className="text-sm font-mono-digits text-white font-semibold">Document Notice</p>
              <p className="text-xs font-mono-digits text-zinc-400">{errorMsg}</p>
              <a
                href={url}
                download={filename}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono-digits rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Document File</span>
              </a>
            </div>
          )}

          {!errorMsg && (
            <div
              className={`flex justify-center transition-opacity duration-200 ${
                loading ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              <canvas
                ref={canvasRef}
                className="rounded-lg shadow-2xl bg-white max-w-full"
                style={{
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

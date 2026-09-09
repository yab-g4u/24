import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Feather,
  ExternalLink,
  FileText,
  Sparkles,
  Search,
  CheckCircle2,
  Award,
  Maximize2,
  X,
  BookOpen,
  Download,
  Clock,
  User,
  Share2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Category } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { WRITING_CHALLENGES } from '../data/challenges';
import { PdfViewerModal } from './PdfViewerModal';

const HIDDEN_DEMO_SUBMISSION_IDS = new Set([
  '25e771d6-e479-4e9a-ac16-206ea08aefb6',
  '9ff0e1c7-c3c8-465b-899b-9389d78c0c49',
  'c6b96d38-1cb8-4607-9932-1386ee564d4a',
]);

export interface ShowcaseItem {
  id: string;
  name: string;
  category: Category;
  challenge_number: number;
  challenge_title: string;
  submission_text?: string | null;
  submission_url?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  file_url?: string | null;
  images?: Array<{ url: string; path?: string; name?: string }>;
  status?: string;
  created_at?: string;
}

const ShowcaseImageThumbnail: React.FC<{
  item: ShowcaseItem;
  onOpenModal: (images: string[], initialIdx?: number) => void;
}> = ({ item, onOpenModal }) => {
  const [resolvedImages, setResolvedImages] = useState<string[]>(() => {
    try {
      const cachedImages = sessionStorage.getItem(`preview_images_${item.id}`);
      if (cachedImages) {
        const parsed = JSON.parse(cachedImages);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const singleCached = sessionStorage.getItem(`preview_${item.id}`);
      if (singleCached) return [singleCached];
    } catch {}

    if (item.images && item.images.length > 0) {
      return item.images.map((img) => img.url);
    }
    if (item.file_url) return [item.file_url];
    return [];
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(resolvedImages.length === 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    // 1. Session storage immediate check
    try {
      const cachedImages = sessionStorage.getItem(`preview_images_${item.id}`);
      if (cachedImages) {
        const parsed = JSON.parse(cachedImages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setResolvedImages(parsed);
          setLoading(false);
          return;
        }
      }
      const singleCached = sessionStorage.getItem(`preview_${item.id}`);
      if (singleCached) {
        setResolvedImages([singleCached]);
        setLoading(false);
        return;
      }
    } catch {}

    async function resolveAllImages() {
      // If item already has pre-resolved image URLs from server
      if (item.images && item.images.length > 0) {
        const validUrls = item.images.map((img) => img.url).filter(Boolean);
        if (validUrls.length > 0 && active) {
          setResolvedImages(validUrls);
          setLoading(false);
          return;
        }
      }

      // Check if file_path is a JSON array string
      let rawPaths: string[] = [];
      if (item.file_path && typeof item.file_path === 'string' && item.file_path.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(item.file_path);
          if (Array.isArray(parsed)) rawPaths = parsed;
        } catch {}
      } else if (item.file_path) {
        rawPaths = [item.file_path];
      } else if (item.file_url) {
        rawPaths = [item.file_url];
      }

      if (rawPaths.length === 0) {
        setLoading(false);
        return;
      }

      const outUrls: string[] = [];
      for (const p of rawPaths) {
        if (!p) continue;
        if (p.startsWith('data:') || p.startsWith('blob:') || (p.startsWith('http') && !p.includes('/api/uploads/'))) {
          outUrls.push(p);
          continue;
        }

        let signedUrl: string | null = null;
        const cleanPath = p.replace(/^\/api\/uploads\//, '');

        // Direct Supabase storage
        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.storage
              .from('submissions')
              .createSignedUrl(cleanPath, 60 * 30);
            if (!error && data?.signedUrl) {
              signedUrl = data.signedUrl;
            }
          } catch (e) {
            console.debug('Supabase thumbnail signed URL error:', e);
          }
        }

        // Server resolver fallback
        if (!signedUrl) {
          try {
            const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(cleanPath)}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.signedUrl) signedUrl = data.signedUrl;
            }
          } catch (e) {
            console.debug('Server signed-url thumbnail error:', e);
          }
        }

        if (signedUrl) {
          outUrls.push(signedUrl);
        } else {
          outUrls.push(p.startsWith('/') ? p : `/api/uploads/${p}`);
        }
      }

      if (active) {
        if (outUrls.length > 0) {
          setResolvedImages(outUrls);
        }
        setLoading(false);
      }
    }

    resolveAllImages();
    return () => {
      active = false;
    };
  }, [item.id, item.file_path, item.file_url, item.images]);

  if (resolvedImages.length === 0 && !loading) return null;

  const currentImg = resolvedImages[activeIdx] || resolvedImages[0];
  const hasMultiple = resolvedImages.length > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : resolvedImages.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev < resolvedImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="mt-3">
      <div
        onClick={() => currentImg && onOpenModal(resolvedImages, activeIdx)}
        className="relative group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer min-h-[160px] flex items-center justify-center select-none"
      >
        {loading && (
          <div className="absolute inset-0 bg-zinc-900/60 animate-pulse flex items-center justify-center text-xs font-mono-digits text-zinc-500">
            <span>Loading image(s)...</span>
          </div>
        )}

        {currentImg && !failed && (
          <img
            src={currentImg}
            alt={`${item.file_name || 'Design visual'} (${activeIdx + 1})`}
            className="w-full h-52 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            onLoad={() => setLoading(false)}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
          />
        )}

        {failed && (
          <div className="p-6 text-center text-zinc-500 font-mono-digits text-xs flex flex-col items-center gap-2">
            <ImageIcon className="w-6 h-6 text-zinc-600" />
            <span>Design submission: {item.file_name || 'image'}</span>
          </div>
        )}

        {/* Top-Right Badge: Multi-image indicator */}
        {hasMultiple && (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-zinc-700/80 text-[11px] font-mono-digits text-white flex items-center gap-1.5 shadow-md">
            <Layers className="w-3 h-3 text-[#ff3b30]" />
            <span>
              {activeIdx + 1} / {resolvedImages.length}
            </span>
          </div>
        )}

        {/* Carousel Navigation Arrows */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity border border-zinc-700 cursor-pointer"
              title="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity border border-zinc-700 cursor-pointer"
              title="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Bottom dot indicators */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
              {resolvedImages.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === activeIdx ? 'bg-white w-3' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {!failed && currentImg && !loading && !hasMultiple && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono-digits gap-1.5">
            <Maximize2 className="w-4 h-4" />
            <span>View Full Image</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ShowcaseView: React.FC = () => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'design' | 'writing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [activeModalImages, setActiveModalImages] = useState<string[]>([]);
  const [activeModalImgIdx, setActiveModalImgIdx] = useState(0);
  const [activeMediumArticle, setActiveMediumArticle] = useState<ShowcaseItem | null>(null);
  const [activePdfDoc, setActivePdfDoc] = useState<{ url: string; title: string; filename: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleOpenImageModal = (images: string[], initialIdx: number = 0) => {
    setActiveModalImages(images);
    setActiveModalImgIdx(initialIdx);
  };

  const handleOpenPdf = async (item: ShowcaseItem) => {
    // 1. Session storage immediate preview (blob URL or direct base64)
    try {
      const local = sessionStorage.getItem(`preview_${item.id}`);
      if (local && (local.startsWith('blob:') || local.startsWith('data:application/pdf'))) {
        setActivePdfDoc({
          url: local,
          title: item.challenge_title,
          filename: item.file_name || 'Document.pdf',
        });
        return;
      }
    } catch {}

    const rawPath = item.file_path || item.file_url;
    let resolvedUrl: string | null = null;

    // 2. If it's already an absolute external signed URL or data URL
    if (
      item.file_url &&
      (item.file_url.startsWith('https://') || item.file_url.startsWith('http://') || item.file_url.startsWith('data:')) &&
      !item.file_url.includes('/api/uploads/')
    ) {
      resolvedUrl = item.file_url;
    }

    // 3. Direct Supabase Storage signed URL (60 * 30 = 30 minutes)
    if (!resolvedUrl && isSupabaseConfigured && rawPath && !rawPath.startsWith('data:') && !rawPath.startsWith('blob:')) {
      try {
        const cleanPath = rawPath.replace(/^\/api\/uploads\//, '');
        const { data, error } = await supabase.storage
          .from('submissions')
          .createSignedUrl(cleanPath, 60 * 30);
        if (!error && data?.signedUrl) {
          resolvedUrl = data.signedUrl;
        }
      } catch (e) {
        console.debug('Supabase direct PDF sign error:', e);
      }
    }

    // 4. Server signed URL endpoint fallback
    if (!resolvedUrl && rawPath && !rawPath.startsWith('data:') && !rawPath.startsWith('blob:')) {
      try {
        const cleanPath = rawPath.replace(/^\/api\/uploads\//, '');
        const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(cleanPath)}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.signedUrl && !json.signedUrl.startsWith('/api/uploads/')) {
            resolvedUrl = json.signedUrl;
          }
        }
      } catch (e) {
        console.debug('Server signed-url PDF error:', e);
      }
    }

    // Fallback: use dedicated streaming endpoint or direct file url
    if (!resolvedUrl) {
      if (rawPath && !rawPath.startsWith('data:') && !rawPath.startsWith('blob:')) {
        const cleanPath = rawPath.replace(/^\/api\/uploads\//, '');
        resolvedUrl = `/api/storage/pdf-stream?path=${encodeURIComponent(cleanPath)}`;
      } else {
        resolvedUrl = item.file_url || (rawPath ? (rawPath.startsWith('/') ? rawPath : `/api/uploads/${rawPath}`) : '');
      }
    }

    setActivePdfDoc({
      url: resolvedUrl,
      title: item.challenge_title,
      filename: item.file_name || 'Document.pdf',
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadAllSubmissions() {
      setLoading(true);
      const fetchedItemsMap = new Map<string, ShowcaseItem>();

      // 1. Fetch from server API
      try {
        const res = await fetch('/api/submissions');
        if (res.ok) {
          const data = await res.json();
          if (data?.submissions && Array.isArray(data.submissions)) {
            data.submissions.forEach((item: ShowcaseItem) => {
              // Ensure file_url is properly resolved
              let fileUrl = item.file_url || item.file_path;
              if (fileUrl && !fileUrl.startsWith('data:') && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://') && !fileUrl.startsWith('/api/uploads/')) {
                fileUrl = `/api/uploads/${fileUrl}`;
              }
              fetchedItemsMap.set(item.id, { ...item, file_url: fileUrl });
            });
          }
        }
      } catch (err) {
        console.debug('Notice: Server submissions fetch fallback:', err);
      }

      // 2. Fetch directly from Supabase if configured (especially beneficial on Vercel static deployment)
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && Array.isArray(data)) {
            data.forEach((row: any) => {
              let fileUrl = row.file_path;
              if (fileUrl && !fileUrl.startsWith('data:') && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://') && !fileUrl.startsWith('/api/uploads/')) {
                fileUrl = `/api/uploads/${fileUrl}`;
              }
              const item: ShowcaseItem = {
                id: row.id,
                name: row.name,
                category: row.category,
                challenge_number: row.challenge_number,
                challenge_title: row.challenge_title,
                submission_text: row.submission_text,
                submission_url: row.submission_url,
                file_path: row.file_path,
                file_name: row.file_name,
                file_type: row.file_type,
                file_size: row.file_size,
                file_url: fileUrl,
                status: row.status || 'submitted',
                created_at: row.created_at,
              };
              fetchedItemsMap.set(item.id, item);
            });
          }
        } catch (supaErr) {
          console.debug('Notice: Supabase direct query notice:', supaErr);
        }
      }

      // 3. Filter out any remaining mock accounts (Elena Rostova, Marcus Vance, Test Participant)
      const sanitized = Array.from(fetchedItemsMap.values()).filter((item) => {
        const name = (item.name || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        return (
          !HIDDEN_DEMO_SUBMISSION_IDS.has(item.id) &&
          !name.includes('elena rostova') &&
          !name.includes('marcus vance') &&
          !name.includes('test participant') &&
          !id.includes('sub_elena') &&
          !id.includes('sub_marcus') &&
          !id.includes('0e27cc2b-2162-421e-8155-630797a8f2ca')
        );
      });

      // Sort newest first
      sanitized.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      if (isMounted) {
        setItems(sanitized);
        setLoading(false);
      }
    }

    loadAllSubmissions();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.challenge_title.toLowerCase().includes(q) ||
      (item.submission_text && item.submission_text.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const calculateReadingTime = (text?: string | null) => {
    if (!text) return '1 min read';
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  };

  const isPdf = (item: ShowcaseItem) => {
    return (
      item.file_type === 'application/pdf' ||
      item.file_name?.toLowerCase().endsWith('.pdf') ||
      item.file_path?.toLowerCase().endsWith('.pdf') ||
      (typeof item.file_url === 'string' && item.file_url.toLowerCase().includes('.pdf')) ||
      (typeof item.file_url === 'string' && item.file_url.startsWith('data:application/pdf'))
    );
  };

  const isImage = (item: ShowcaseItem) => {
    return (
      item.category === 'design' ||
      item.file_type?.startsWith('image/') ||
      item.file_name?.toLowerCase().endsWith('.png') ||
      item.file_name?.toLowerCase().endsWith('.jpg') ||
      item.file_name?.toLowerCase().endsWith('.jpeg') ||
      item.file_name?.toLowerCase().endsWith('.webp') ||
      (typeof item.file_url === 'string' && item.file_url.startsWith('data:image/')) ||
      (Boolean(item.images && item.images.length > 0)) ||
      (Boolean(item.file_path && !item.file_path.toLowerCase().endsWith('.pdf')))
    );
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-zinc-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono-digits text-zinc-300 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#ff3b30]" />
            <span>COMMUNITY REPOSITORY</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            SUBMITTED PROJECTS
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl">
            Real projects created in under 24 hours. Every entry locked, reviewed, and preserved in the archive.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-digits transition-all cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ALL ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('design')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-digits flex items-center space-x-1.5 transition-all cursor-pointer ${
              filterCategory === 'design'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>DESIGN</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('writing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-digits flex items-center space-x-1.5 transition-all cursor-pointer ${
              filterCategory === 'writing'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Feather className="w-3 h-3" />
            <span>WRITING</span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by creator name, challenge title, or essay text..."
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-mono-digits"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Showcase Grid */}
      {loading ? (
        <div className="p-16 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-zinc-400 font-mono-digits text-sm">
          Loading verified community submissions...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-xl text-white">NO SUBMISSIONS FOUND</h3>
          <p className="text-zinc-500 font-mono-digits text-xs max-w-sm mx-auto">
            {searchQuery
              ? 'No projects match your search query. Try clearing the filter.'
              : 'Be the first creator to spin the wheel and lock in your 24-hour challenge!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => {
            const hasPdf = isPdf(item);
            const hasImage = isImage(item);
            const hasWritingText = Boolean(item.submission_text && item.submission_text.trim());

            return (
              <div
                key={item.id}
                className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 shadow-lg"
              >
                {/* Top metadata */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono-digits uppercase font-bold tracking-wider ${
                          item.category === 'design'
                            ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                            : 'bg-zinc-800 text-amber-300 border border-zinc-700'
                        }`}
                      >
                        {item.category === 'design' ? (
                          <Layers className="w-3 h-3" />
                        ) : (
                          <Feather className="w-3 h-3" />
                        )}
                        <span>
                          {item.category} #{item.challenge_number}
                        </span>
                      </span>

                      {item.status === 'winner' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-digits uppercase bg-amber-950/60 text-amber-400 border border-amber-800/80 font-bold">
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>WINNER</span>
                        </span>
                      )}

                      {item.status === 'reviewed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-digits uppercase bg-emerald-950/50 text-emerald-400 border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>REVIEWED</span>
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-mono-digits text-zinc-500">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-white tracking-tight mb-1">
                    {item.challenge_title}
                  </h3>

                  <div className="text-xs font-mono-digits text-zinc-400 mb-3 flex items-center gap-2">
                    <span>
                      By <span className="text-zinc-200 font-semibold">{item.name}</span>
                    </span>
                    {hasWritingText && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500">{calculateReadingTime(item.submission_text)}</span>
                      </>
                    )}
                  </div>

                  {/* Written Piece Preview (Medium / Telegraph preview trigger) */}
                  {hasWritingText && (
                    <div
                      onClick={() => setActiveMediumArticle(item)}
                      className="group cursor-pointer p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-2 mb-3"
                    >
                      <div className="flex items-center justify-between text-xs font-mono-digits text-zinc-400">
                        <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>READ FULL PIECE</span>
                        </span>
                        <span className="group-hover:translate-x-0.5 transition-transform text-zinc-400">
                          Medium View →
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 font-serif leading-relaxed line-clamp-3 italic">
                        "{item.submission_text}"
                      </p>
                    </div>
                  )}

                  {/* PDF Document Preview Trigger */}
                  {hasPdf && (
                    <button
                      type="button"
                      onClick={() => handleOpenPdf(item)}
                      className="w-full mb-3 flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all text-left cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-800/60 flex items-center justify-center shrink-0 text-red-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-mono-digits text-white font-bold truncate">
                            {item.file_name || 'Attached PDF Document'}
                          </div>
                          <div className="text-[11px] font-mono-digits text-zinc-500">
                            Click to preview document in-browser
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono-digits text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                        Open PDF →
                      </span>
                    </button>
                  )}

                  {/* Image Artifact Thumbnail with Multi-image Lightbox */}
                  {hasImage && (
                    <ShowcaseImageThumbnail
                      item={item}
                      onOpenModal={(images, idx) => handleOpenImageModal(images, idx)}
                    />
                  )}
                </div>

                {/* Footer action */}
                {item.submission_url && (
                  <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <a
                      href={item.submission_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-xs font-mono-digits text-zinc-400 hover:text-white transition-colors"
                    >
                      <span>External Project Link</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#ff3b30]" />
                    </a>
                    <span className="text-[11px] font-mono-digits text-zinc-600">
                      Verified Link
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. TELEGRAPH / MEDIUM EDITORIAL READER MODAL                    */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {activeMediumArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0e0e11]/95 backdrop-blur-md overflow-y-auto"
            onClick={() => setActiveMediumArticle(null)}
          >
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-10 bg-[#0e0e11]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-xs font-mono-digits text-zinc-400">
                <span className="text-white font-bold">24</span>
                <span>•</span>
                <span className="text-amber-300 font-bold uppercase">
                  WRITING #{activeMediumArticle.challenge_number}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  {calculateReadingTime(activeMediumArticle.submission_text)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveMediumArticle(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-mono-digits text-zinc-300 transition-colors cursor-pointer"
              >
                <span>Close</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Medium Article Container */}
            <div
              className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Category & Challenge badge */}
              <div className="mb-4">
                <span className="inline-block px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono-digits uppercase font-bold tracking-wider">
                  WRITING CHALLENGE #{activeMediumArticle.challenge_number}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-[1.15] mb-4">
                {activeMediumArticle.challenge_title}
              </h1>

              {/* Subtitle / Theme prompt */}
              {WRITING_CHALLENGES.find((c) => c.id === activeMediumArticle.challenge_number)
                ?.subtitle && (
                <p className="text-xl sm:text-2xl text-zinc-400 font-serif italic mb-8 leading-snug">
                  "{WRITING_CHALLENGES.find((c) => c.id === activeMediumArticle.challenge_number)?.subtitle}"
                </p>
              )}

              {/* Author & Timestamp Row */}
              <div className="flex items-center justify-between border-y border-zinc-800/80 py-4 mb-10">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-display font-bold text-white text-sm">
                    {activeMediumArticle.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white font-mono-digits">
                      {activeMediumArticle.name}
                    </div>
                    <div className="text-xs font-mono-digits text-zinc-500 flex items-center gap-2">
                      <span>{formatDate(activeMediumArticle.created_at)}</span>
                      <span>•</span>
                      <span>{calculateReadingTime(activeMediumArticle.submission_text)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono-digits text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>24-Hour Verified</span>
                </div>
              </div>

              {/* Article Prose Content */}
              <div className="prose prose-invert max-w-none text-zinc-200 font-serif text-lg sm:text-xl leading-[1.8] space-y-6">
                {activeMediumArticle.submission_text
                  ?.split(/\n\n+/)
                  .map((paragraph, index) => (
                    <p
                      key={index}
                      className={index === 0 ? 'first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-white' : ''}
                    >
                      {paragraph.trim()}
                    </p>
                  ))}
              </div>

              {/* Linked project artifact */}
              {activeMediumArticle.submission_url && (
                <div className="mt-12 p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono-digits text-zinc-400">EXTERNAL PUBLICATION</div>
                    <div className="text-sm font-mono-digits text-white truncate max-w-md">
                      {activeMediumArticle.submission_url}
                    </div>
                  </div>
                  <a
                    href={activeMediumArticle.submission_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2 rounded-xl bg-white text-black text-xs font-mono-digits font-bold flex items-center gap-1.5 hover:bg-zinc-200 transition-colors"
                  >
                    <span>Visit Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Article Footer */}
              <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-mono-digits text-zinc-500">
                  Forged in 24 hours under the 24 Hour Challenge.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMediumArticle(null)}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono-digits text-zinc-300 transition-colors cursor-pointer"
                >
                  ← Return to Community Showcase
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 2. IN-BROWSER PDF PREVIEW MODAL (Direct Native Canvas PDF)     */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {activePdfDoc && (
          <PdfViewerModal
            url={activePdfDoc.url}
            title={activePdfDoc.title}
            filename={activePdfDoc.filename}
            onClose={() => setActivePdfDoc(null)}
          />
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 3. IMAGE LIGHTBOX MODAL (Multi-Image Support)                  */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModalImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setActiveModalImages([])}
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar */}
              <div className="w-full flex items-center justify-between pb-3 text-xs font-mono-digits text-zinc-400">
                <div className="flex items-center gap-2">
                  {activeModalImages.length > 1 && (
                    <span className="px-2.5 py-1 rounded bg-zinc-800 text-white font-bold">
                      {activeModalImgIdx + 1} / {activeModalImages.length}
                    </span>
                  )}
                  <span className="truncate max-w-xs text-zinc-300">
                    Full Resolution Image
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={activeModalImages[activeModalImgIdx]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#ff3b30]" />
                    <span className="hidden sm:inline">Open Original</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveModalImages([])}
                    className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Image Stage */}
              <div className="relative flex items-center justify-center w-full">
                <img
                  src={activeModalImages[activeModalImgIdx]}
                  alt={`Submission visual ${activeModalImgIdx + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl border border-zinc-800 shadow-2xl"
                />

                {/* Lightbox Navigation Controls */}
                {activeModalImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalImgIdx((prev) =>
                          prev > 0 ? prev - 1 : activeModalImages.length - 1
                        );
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center border border-zinc-700 transition-transform active:scale-95 cursor-pointer shadow-lg"
                      title="Previous"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalImgIdx((prev) =>
                          prev < activeModalImages.length - 1 ? prev + 1 : 0
                        );
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center border border-zinc-700 transition-transform active:scale-95 cursor-pointer shadow-lg"
                      title="Next"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails strip at bottom if multi-image */}
              {activeModalImages.length > 1 && (
                <div className="flex items-center gap-2 mt-3 p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 max-w-full overflow-x-auto">
                  {activeModalImages.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveModalImgIdx(i)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        i === activeModalImgIdx
                          ? 'border-[#ff3b30] opacity-100 scale-105'
                          : 'border-transparent opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img src={src} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

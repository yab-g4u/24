import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  Link2,
  CheckCircle2,
  Lock,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  ExternalLink,
  Loader2,
  Mail,
  User,
  AlertCircle,
  FileCheck,
  BookOpen,
  Download,
  Plus,
  X,
  Layers,
} from 'lucide-react';
import { Category, Challenge, SubmissionData } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { playLockSound, playChimeSound } from '../utils/sound';
import { triggerCelebration } from '../utils/confetti';

interface SubmissionFormProps {
  category: Category;
  challenge?: Challenge;
  submission: SubmissionData | null;
  onSubmit: (data: SubmissionData) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const DESIGN_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
const WRITING_EXTENSIONS = ['.pdf']; // PDF only for writing challenges as requested

// Helper: resolve verified MIME content type according to user specification
function getAccurateContentType(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.pdf')) return 'application/pdf';
  return file.type || 'application/octet-stream';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  category,
  challenge,
  submission,
  onSubmit,
}) => {
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [writingText, setWritingText] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const isSubmittedRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when component unmounts (only if discarded, not if submitted)
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        filePreviewUrls.forEach((url) => {
          if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pdfBlobUrl);
        }
      }
    };
  }, [filePreviewUrls, pdfBlobUrl]);

  // Add / Validate files
  const handleFilesAdded = (incomingList: FileList | File[]) => {
    setError(null);
    const newFiles = Array.from(incomingList);
    if (newFiles.length === 0) return;

    if (category === 'writing') {
      const singleFile = newFiles[0];
      if (singleFile.size > MAX_FILE_SIZE) {
        setError(`File is too large (${(singleFile.size / (1024 * 1024)).toFixed(1)} MB). Max allowed size is 20 MB.`);
        return;
      }
      if (!singleFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Writing submissions require PDF documents (.pdf). Please upload a valid PDF file.');
        return;
      }
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      const newPdfBlob = URL.createObjectURL(singleFile);
      setPdfBlobUrl(newPdfBlob);
      setSelectedFiles([singleFile]);
      setFilePreviewUrls(['pdf-attached']);
      return;
    }

    // Design category: multiple images allowed
    const validAdditions: File[] = [];
    const validPreviews: string[] = [];

    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds 20 MB limit.`);
        continue;
      }
      const lower = file.name.toLowerCase();
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(lower);
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');

      if (!isImg && !isPdf) {
        setError(`Unsupported format: "${file.name}". Please upload PNG, JPG, WEBP, or PDF.`);
        continue;
      }

      validAdditions.push(file);
      if (isImg) {
        validPreviews.push(URL.createObjectURL(file));
      } else {
        validPreviews.push('pdf-attached');
      }
    }

    if (validAdditions.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validAdditions]);
      setFilePreviewUrls((prev) => [...prev, ...validPreviews]);
    }
  };

  const handleRemoveSingleFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetPreview = filePreviewUrls[index];
    if (targetPreview && targetPreview.startsWith('blob:')) {
      URL.revokeObjectURL(targetPreview);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviewUrls((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAllFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    filePreviewUrls.forEach((u) => {
      if (u && u.startsWith('blob:')) URL.revokeObjectURL(u);
    });
    if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) URL.revokeObjectURL(pdfBlobUrl);
    setSelectedFiles([]);
    setFilePreviewUrls([]);
    setPdfBlobUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    // 1. Validation
    if (!handle.trim()) {
      setError('Please enter your participant name or handle.');
      return;
    }

    if (category === 'design') {
      if (selectedFiles.length === 0 && !link.trim() && !notes.trim()) {
        setError('Please attach your design image(s) or provide a link to your project.');
        return;
      }
    } else {
      // Writing category
      if (!writingText.trim() && selectedFiles.length === 0 && !link.trim()) {
        setError('Please paste your written piece, upload your PDF, or share an article link.');
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgressMsg('Securing challenge submission...');

    try {
      const submissionId = crypto.randomUUID();
      let storageFilePath: string | null = null;
      let uploadedFileName: string | null = null;
      let uploadedFileType: string | null = null;
      let uploadedFileSize: number | null = null;
      let immediateFileUrl: string | null = null;
      const uploadedImagesList: Array<{ url: string; path: string; name: string; size: number; type: string }> = [];

      // 2. Upload raw binary file(s) via FormData & convert to data URLs for cross-device durability
      if (selectedFiles.length > 0) {
        setUploadProgressMsg(`Securing ${selectedFiles.length} file(s)...`);
        const primaryFile = selectedFiles[0];
        uploadedFileName = selectedFiles.map((f) => f.name).join(', ');
        uploadedFileType = getAccurateContentType(primaryFile);
        uploadedFileSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

        // Pre-convert files to Data URLs for instant & cross-device preview fallback
        const fileDataUrls: string[] = [];
        for (const file of selectedFiles) {
          try {
            const dUrl = await fileToDataUrl(file);
            if (dUrl) fileDataUrls.push(dUrl);
          } catch (e) {
            console.debug('Data URL conversion note:', e);
          }
        }

        if (fileDataUrls.length > 0) {
          immediateFileUrl = fileDataUrls[0];
          storageFilePath = fileDataUrls.length > 1 ? JSON.stringify(fileDataUrls) : fileDataUrls[0];
          fileDataUrls.forEach((dUrl, idx) => {
            const curFile = selectedFiles[idx] || primaryFile;
            uploadedImagesList.push({
              url: dUrl,
              path: dUrl,
              name: curFile.name,
              size: curFile.size,
              type: getAccurateContentType(curFile),
            });
          });
        }

        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('file', primaryFile); // backwards compatibility
        formData.append('id', submissionId);
        formData.append('category', category);

        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            if (uploadJson.fileUrl && !uploadJson.fileUrl.startsWith('/api/uploads/')) {
              immediateFileUrl = uploadJson.fileUrl;
            }
            if (uploadJson.filePath && !uploadJson.filePath.startsWith('file_')) {
              storageFilePath = uploadJson.filePath;
            }
            if (uploadJson.files && Array.isArray(uploadJson.files)) {
              uploadJson.files.forEach((f: any, i: number) => {
                if (uploadedImagesList[i]) {
                  uploadedImagesList[i].path = f.filePath || uploadedImagesList[i].path;
                  if (f.fileUrl && !f.fileUrl.startsWith('/api/uploads/')) {
                    uploadedImagesList[i].url = f.fileUrl;
                  }
                }
              });
            }
          }
        } catch (serverErr) {
          console.debug('Server upload fallback notice:', serverErr);
        }

        // Direct upload to Supabase private storage bucket
        if (isSupabaseConfigured) {
          const supaPaths: string[] = [];
          for (let i = 0; i < selectedFiles.length; i++) {
            const curFile = selectedFiles[i];
            const safeName = curFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const prefix = selectedFiles.length > 1 ? `${i}_` : '';
            const curStoragePath = `${submissionId}/${prefix}${safeName}`;
            const curType = getAccurateContentType(curFile);

            try {
              const { error: supaUploadError } = await supabase.storage
                .from('submissions')
                .upload(curStoragePath, curFile, {
                  contentType: curType,
                  upsert: false,
                });

              if (!supaUploadError) {
                supaPaths.push(curStoragePath);
                const { data: signData } = await supabase.storage
                  .from('submissions')
                  .createSignedUrl(curStoragePath, 60 * 60);

                if (signData?.signedUrl) {
                  if (i === 0) immediateFileUrl = signData.signedUrl;
                  if (uploadedImagesList[i]) {
                    uploadedImagesList[i].url = signData.signedUrl;
                    uploadedImagesList[i].path = curStoragePath;
                  }
                }
              }
            } catch (supaErr) {
              console.debug('Supabase direct upload notice:', supaErr);
            }
          }

          if (supaPaths.length > 0) {
            storageFilePath = supaPaths.length > 1 ? JSON.stringify(supaPaths) : supaPaths[0];
          }
        }

        // Cache immediate preview URLs in session storage for instantaneous showcase display
        try {
          if (category === 'writing' && pdfBlobUrl) {
            sessionStorage.setItem(`preview_${submissionId}`, pdfBlobUrl);
          } else if (filePreviewUrls.length > 0) {
            const realBlobPreviews = filePreviewUrls.filter((u) => u.startsWith('blob:'));
            if (realBlobPreviews.length > 0) {
              sessionStorage.setItem(`preview_${submissionId}`, realBlobPreviews[0]);
              sessionStorage.setItem(`preview_images_${submissionId}`, JSON.stringify(realBlobPreviews));
            }
          }
        } catch {}
      }

      // 3. Record metadata in public.submissions table and local store
      setUploadProgressMsg('Recording submission in database...');
      const finalSubmissionText =
        category === 'writing'
          ? writingText.trim() || notes.trim() || null
          : notes.trim() || null;

      const submissionPayload = {
        id: submissionId,
        name: handle.trim(),
        email: email.trim() || null,
        category,
        challenge_number: challenge?.id || 1,
        challenge_title: challenge?.title || `${category.toUpperCase()} Challenge`,
        submission_text: finalSubmissionText,
        submission_url: link.trim() || null,
        file_path: storageFilePath,
        file_name: uploadedFileName,
        file_type: uploadedFileType,
        file_size: uploadedFileSize,
        status: 'submitted',
      };

      if (isSupabaseConfigured) {
        try {
          const { error: dbError } = await supabase.from('submissions').insert(submissionPayload);
          if (dbError) {
            console.debug('Supabase database insert notice:', dbError.message);
          }
        } catch (dbErr: any) {
          console.debug('Supabase database exception notice:', dbErr?.message || dbErr);
        }
      }

      // Push to server database / file cache
      try {
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionPayload),
        });
      } catch (serverDbErr) {
        console.debug('Server store sync notice:', serverDbErr);
      }

      // 4. Construct local submission record
      const newSubmission: SubmissionData = {
        id: submissionId,
        handle: handle.trim(),
        name: handle.trim(),
        email: email.trim() || undefined,
        category,
        challengeNumber: challenge?.id,
        challengeTitle: challenge?.title,
        link: link.trim() || undefined,
        notes: notes.trim() || undefined,
        submissionText: finalSubmissionText || undefined,
        submissionUrl: link.trim() || undefined,
        filePath: storageFilePath || undefined,
        fileName: uploadedFileName || undefined,
        fileDataUrl: immediateFileUrl || filePreviewUrls[0] || pdfBlobUrl || undefined,
        fileType: uploadedFileType || undefined,
        fileSize: uploadedFileSize || undefined,
        images: uploadedImagesList.length > 0 ? uploadedImagesList : undefined,
        status: 'submitted',
        submittedAt: Date.now(),
      };

      if (immediateFileUrl || filePreviewUrls[0] || pdfBlobUrl) {
        try {
          sessionStorage.setItem(
            `preview_${submissionId}`,
            immediateFileUrl || filePreviewUrls[0] || pdfBlobUrl || ''
          );
        } catch {}
      }

      isSubmittedRef.current = true;
      playLockSound();
      playChimeSound();
      triggerCelebration();

      onSubmit(newSubmission);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setError(err?.message || 'Failed to submit challenge entry. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgressMsg(null);
    }
  };

  // If already submitted and locked
  if (submission) {
    const isWritingCategory = category === 'writing' || submission.category === 'writing';
    const hasWritingText = Boolean(submission.submissionText || submission.notes);
    const hasPdfFile =
      submission.fileType === 'application/pdf' ||
      submission.fileName?.toLowerCase().endsWith('.pdf') ||
      (submission.filePath && submission.filePath.startsWith('data:application/pdf'));

    const displayFileUrl = submission.fileDataUrl || submission.filePath;

    return (
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-2xl text-white">SUBMISSION LOCKED</h3>
            <p className="text-xs font-mono-digits text-zinc-400">
              Submitted by {submission.handle || submission.name} • {new Date(submission.submittedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 text-left">
          <div className="flex items-center justify-between text-xs font-mono-digits text-zinc-400">
            <span className="uppercase text-zinc-300 font-bold">
              {submission.category || category} CHALLENGE #{submission.challengeNumber || challenge?.id}
            </span>
            <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
              <Lock className="w-3 h-3" /> VERIFIED ENTRY
            </span>
          </div>

          <div className="font-display font-bold text-lg text-white">
            {submission.challengeTitle || challenge?.title}
          </div>

          {/* Written piece content */}
          {hasWritingText && (
            <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <div className="text-xs font-mono-digits text-amber-300 mb-2 flex items-center gap-1.5 font-bold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>YOUR WRITTEN PIECE:</span>
              </div>
              <p className="text-sm font-serif text-zinc-300 whitespace-pre-wrap leading-relaxed italic">
                "{submission.submissionText || submission.notes}"
              </p>
            </div>
          )}

          {/* PDF document attachment */}
          {hasPdfFile && displayFileUrl && (
            <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 truncate">
                <FileText className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-xs font-mono-digits text-zinc-200 font-bold truncate">
                  {submission.fileName || 'Attached PDF Document'}
                </span>
              </div>
              <a
                href={displayFileUrl}
                download={submission.fileName || 'submission.pdf'}
                target="_blank"
                rel="noreferrer noopener"
                className="px-3 py-1 rounded bg-zinc-800 text-xs font-mono-digits text-zinc-200 hover:text-white transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Download PDF</span>
              </a>
            </div>
          )}

          {/* Image file attachment */}
          {!hasPdfFile && displayFileUrl && (
            <div className="mt-3 rounded-lg overflow-hidden border border-zinc-800 max-h-60 bg-zinc-950">
              <img
                src={displayFileUrl}
                alt="Submitted visual"
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {submission.link && (
            <div className="pt-2 flex items-center justify-between text-xs font-mono-digits">
              <span className="text-zinc-500">Project URL:</span>
              <a
                href={submission.link}
                target="_blank"
                rel="noreferrer noopener"
                className="text-white hover:underline flex items-center gap-1 truncate max-w-xs"
              >
                <span>{submission.link}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="text-center pt-2">
          <p className="text-xs font-mono-digits text-zinc-500">
            Your project is archived in the community showcase on the landing page.
          </p>
        </div>
      </div>
    );
  }

  const wordCount = writingText.trim() ? writingText.trim().split(/\s+/).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-6 text-left">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="font-display font-bold text-2xl text-white">SUBMIT YOUR PROJECT</h3>
          <p className="text-xs font-mono-digits text-zinc-400">
            Lock in your proof of work before your 24 hours expire.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono-digits font-bold uppercase text-xs">
          {category}
        </span>
      </div>

      {challenge && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
          <div className="text-[11px] font-mono-digits uppercase tracking-wider text-zinc-400">
            ACTIVE DIRECTIVE #{challenge.id}
          </div>
          <div className="font-display font-bold text-lg text-white">{challenge.title}</div>
          {challenge.subtitle && (
            <div className="text-xs text-zinc-400 font-serif italic">"{challenge.subtitle}"</div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs font-mono-digits text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name and Email Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono-digits uppercase text-zinc-300 tracking-wider">
              Participant Name / Handle <span className="text-[#ff3b30]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. Alex Rivera or @alex_r"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-mono-digits"
              />
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono-digits uppercase text-zinc-400 tracking-wider">
              Email Address <span className="text-zinc-600">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="email"
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-mono-digits"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Writing Category: "Your Written Piece" Field */}
        {category === 'writing' && (
          <div className="space-y-2 p-5 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-mono-digits uppercase text-amber-300 font-bold tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Your Written Piece</span>
              </label>
              <div className="text-[11px] font-mono-digits text-zinc-400">
                {wordCount} words • {readingTimeMinutes} min read
              </div>
            </div>
            <p className="text-xs text-zinc-400">
              Paste or type your complete article, essay, or thoughts below. When viewed in the showcase, readers can enjoy it in an elegant Medium-style editorial view.
            </p>
            <textarea
              rows={8}
              disabled={isSubmitting}
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              placeholder="In our hyper-connected epoch, silence is no longer an absence—it is an endangered architectural material..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-serif leading-relaxed"
            />
          </div>
        )}

        {/* File Upload Dropzone (Supports multiple images for Design, PDF for Writing) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono-digits uppercase text-zinc-300 tracking-wider">
              {category === 'writing'
                ? 'Upload PDF Document (PDF only)'
                : 'Upload Design Visuals (Multiple Images Allowed)'}
              <span className="text-zinc-500 font-normal ml-2">(Max 20 MB each)</span>
            </label>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllFiles}
                className="text-xs font-mono-digits text-red-400 hover:underline cursor-pointer"
              >
                Clear all ({selectedFiles.length})
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isSubmitting) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!isSubmitting && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesAdded(e.dataTransfer.files);
              }
            }}
            onClick={() => {
              if (!isSubmitting) fileInputRef.current?.click();
            }}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-white bg-zinc-900'
                : selectedFiles.length > 0
                ? 'border-emerald-600/70 bg-emerald-950/10'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              disabled={isSubmitting}
              multiple={category === 'design'}
              className="hidden"
              accept={
                category === 'writing'
                  ? 'application/pdf,.pdf'
                  : 'image/png,image/jpeg,image/webp,application/pdf'
              }
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesAdded(e.target.files);
                }
              }}
            />

            {selectedFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm font-mono-digits text-emerald-400 font-semibold">
                  <FileCheck className="w-5 h-5" />
                  <span>
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'file attached' : 'files attached'}
                  </span>
                  <span className="text-zinc-400 text-xs font-normal">
                    (Total: {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>

                {/* Multiple image thumbnails preview */}
                {category === 'design' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
                    {selectedFiles.map((file, idx) => {
                      const prevUrl = filePreviewUrls[idx];
                      const isImg = prevUrl && prevUrl.startsWith('blob:');

                      return (
                        <div
                          key={idx}
                          className="group relative rounded-lg border border-zinc-800 bg-zinc-950/80 p-2 flex flex-col items-center justify-between text-left overflow-hidden"
                        >
                          {isImg ? (
                            <div className="w-full h-24 rounded bg-black/50 overflow-hidden flex items-center justify-center mb-1.5">
                              <img
                                src={prevUrl}
                                alt={file.name}
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-24 rounded bg-zinc-900 flex flex-col items-center justify-center mb-1.5 text-zinc-400">
                              <FileText className="w-6 h-6 text-red-400 mb-1" />
                              <span className="text-[10px] font-mono-digits text-zinc-400">PDF</span>
                            </div>
                          )}

                          <div className="w-full px-1">
                            <p className="text-[11px] font-mono-digits text-white truncate font-medium">
                              {file.name}
                            </p>
                            <p className="text-[10px] font-mono-digits text-zinc-400">
                              {(file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>

                          {/* Delete individual button */}
                          <button
                            type="button"
                            onClick={(e) => handleRemoveSingleFile(idx, e)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-red-600 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700"
                            title="Remove this image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add More Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="h-full min-h-[120px] rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/80 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-white transition-all cursor-pointer p-3"
                    >
                      <Plus className="w-5 h-5 text-zinc-400" />
                      <span className="text-xs font-mono-digits">Add More</span>
                    </button>
                  </div>
                )}

                {/* Single PDF indicator for writing */}
                {category === 'writing' && (
                  <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-950/60 border border-red-800/80 text-xs font-mono-digits text-red-300">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span>{selectedFiles[0]?.name} • Ready for showcase preview</span>
                  </div>
                )}

                <p className="text-xs text-zinc-400">
                  {category === 'design'
                    ? 'Click "Add More" or drop more files to include multiple presentation images'
                    : 'Click to replace attached PDF document'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
                  {category === 'writing' ? (
                    <FileText className="w-5 h-5 text-red-400" />
                  ) : (
                    <Layers className="w-5 h-5 text-[#ff3b30]" />
                  )}
                </div>
                <div className="text-sm font-medium text-zinc-200">
                  <span className="font-semibold text-white underline">Click to browse</span> or drag and drop
                </div>
                <p className="text-xs font-mono-digits text-zinc-500">
                  {category === 'writing'
                    ? 'Only PDF documents accepted (.pdf, up to 20MB)'
                    : 'Upload one or multiple images: PNG, JPG, JPEG, WEBP, or PDF (up to 20MB each)'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Link Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-digits uppercase text-zinc-300 tracking-wider">
            Submission URL <span className="text-zinc-500 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              disabled={isSubmitting}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={
                category === 'design'
                  ? 'https://figma.com/..., behance.net/..., or github.com/...'
                  : 'https://medium.com/..., substack.com/..., or notion.so/...'
              }
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-mono-digits"
            />
            <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-digits uppercase text-zinc-400 tracking-wider">
            Creator Notes <span className="text-zinc-600">(Optional)</span>
          </label>
          <textarea
            rows={2}
            disabled={isSubmitting}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was your concept or technique? How did you respond to the 24-hour limit?"
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-mono-digits"
          />
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 px-6 rounded-xl font-mono-digits text-base sm:text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
            isSubmitting
              ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
              : 'text-black bg-white hover:bg-zinc-100 active:scale-[0.99] cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.15)]'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              <span>{uploadProgressMsg || 'LOCKING SUBMISSION...'}</span>
            </>
          ) : (
            <>
              <span>SUBMIT WORK & LOCK IN FATE</span>
              <ArrowRight className="w-5 h-5 text-black" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

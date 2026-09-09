import React, { useState, useRef } from 'react';
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
const WRITING_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate chosen file
  const validateAndSetFile = (file: File) => {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 20 MB.`
      );
      return;
    }

    const fileNameLower = file.name.toLowerCase();
    const allowedExts = category === 'design' ? DESIGN_EXTENSIONS : WRITING_EXTENSIONS;
    const hasValidExt = allowedExts.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExt) {
      setError(
        `Invalid file type for ${category}. Allowed extensions: ${allowedExts.join(', ')}`
      );
      return;
    }

    setSelectedFile(file);

    // Create thumbnail preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    // 1. Validation
    if (!handle.trim()) {
      setError('Please enter your name or creator handle.');
      return;
    }

    if (category === 'design') {
      if (!selectedFile && !link.trim() && !notes.trim()) {
        setError('Please attach your design file or provide a link to your work.');
        return;
      }
    } else {
      // Writing category
      if (!writingText.trim() && !selectedFile && !link.trim()) {
        setError(
          'Please provide your writing directly in the text box, upload a document, or share a link.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgressMsg('Securing challenge entry...');

    try {
      const submissionId = crypto.randomUUID();
      let storageFilePath: string | null = null;
      let uploadedFileName: string | null = null;
      let uploadedFileType: string | null = null;
      let uploadedFileSize: number | null = null;

      // 2. Upload file to Supabase Storage if file attached
      if (selectedFile) {
        setUploadProgressMsg(`Uploading ${selectedFile.name} to Supabase...`);
        const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${submissionId}_${sanitizedName}`;
        uploadedFileName = selectedFile.name;
        uploadedFileType = selectedFile.type || 'application/octet-stream';
        uploadedFileSize = selectedFile.size;

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.storage
            .from("submissions")
            .upload(filePath, selectedFile);

          if (error) {
            console.error('Storage upload error:', error);
            if (error.message && error.message.toLowerCase().includes('row-level security')) {
              throw new Error(
                `File upload failed: ${error.message}. Please ensure the "submissions" bucket in Supabase allows INSERT for anonymous users.`
              );
            }
            throw new Error(`File upload failed: ${error.message}`);
          }

          storageFilePath = data?.path || filePath;
        } else {
          storageFilePath = filePath;
        }
      }

      // 3. Insert metadata into public.submissions table and sync with server
      setUploadProgressMsg('Locking submission in database...');
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
            console.warn('Supabase database insert notice:', dbError.message);
          }
        } catch (dbErr: any) {
          console.warn('Supabase database insert exception:', dbErr?.message || dbErr);
        }
      }

      // Ensure server local store also receives the submission for durable persistence
      try {
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionPayload),
        });
      } catch (serverErr) {
        console.warn('Server store sync notice:', serverErr);
      }

      // 4. Construct local submission object
      const newSubmission: SubmissionData = {
        id: submissionId,
        handle: handle.trim(),
        name: handle.trim(),
        email: email.trim() || undefined,
        category,
        challengeNumber: challenge?.id || 1,
        challengeTitle: challenge?.title || `${category.toUpperCase()} Challenge`,
        link: link.trim() || undefined,
        submissionUrl: link.trim() || undefined,
        notes: notes.trim() || undefined,
        submissionText: finalSubmissionText || undefined,
        filePath: storageFilePath || undefined,
        fileName: uploadedFileName || undefined,
        fileType: uploadedFileType || undefined,
        fileSize: uploadedFileSize || undefined,
        fileDataUrl: filePreviewUrl || undefined,
        status: 'submitted',
        submittedAt: Date.now(),
      };

      // 5. Trigger feedback
      playLockSound();
      playChimeSound();
      triggerCelebration();

      onSubmit(newSubmission);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(
        err.message || 'An error occurred while submitting your challenge. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgressMsg(null);
    }
  };

  // -------------------------------------------------------------
  // Locked view when submission is already recorded
  // -------------------------------------------------------------
  if (submission) {
    return (
      <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 space-y-6 text-left shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-emerald-400 font-mono-digits text-xs font-bold uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4" />
              <span>SUBMISSION LOCKED ✓</span>
            </div>
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              IT'S OUT THERE NOW.
            </h3>
            <p className="text-zinc-400 text-sm font-medium">
              You did it in under 24 hours. Fate has recorded your work.
            </p>
          </div>

          <div className="text-xs font-mono-digits text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-center">
            {new Date(submission.submittedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>

        {/* Submission record */}
        <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-digits text-zinc-400">
            <span>CHALLENGE</span>
            <span className="text-[#ff3b30] font-bold uppercase">
              {submission.category || category} #{submission.challengeNumber || challenge?.id}:{' '}
              {submission.challengeTitle || challenge?.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-digits text-zinc-400">
            <span>CREATOR</span>
            <span className="text-white font-bold">{submission.name || submission.handle}</span>
          </div>

          {submission.email && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-digits text-zinc-400">
              <span>EMAIL</span>
              <span className="text-zinc-300">{submission.email}</span>
            </div>
          )}

          {(submission.submissionUrl || submission.link) && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-digits text-zinc-400">
              <span>WORK URL</span>
              <a
                href={
                  (submission.submissionUrl || submission.link)!.startsWith('http')
                    ? (submission.submissionUrl || submission.link)!
                    : `https://${submission.submissionUrl || submission.link}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="text-[#ff3b30] hover:underline flex items-center gap-1 font-semibold truncate max-w-[260px] sm:max-w-md"
              >
                <span>{submission.submissionUrl || submission.link}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {submission.fileName && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-digits text-zinc-400">
                <span>ATTACHED FILE</span>
                <span className="text-zinc-200 font-medium truncate max-w-[240px]">
                  {submission.fileName}
                  {submission.fileSize ? ` (${(submission.fileSize / 1024).toFixed(0)} KB)` : ''}
                </span>
              </div>

              {submission.fileDataUrl && submission.fileType?.startsWith('image/') && (
                <div className="mt-3 rounded-lg overflow-hidden border border-zinc-800 bg-black/40 max-h-72 flex items-center justify-center p-2">
                  <img
                    src={submission.fileDataUrl}
                    alt="Submitted work"
                    className="max-h-64 object-contain rounded"
                  />
                </div>
              )}
            </div>
          )}

          {(submission.submissionText || submission.notes) && (
            <div className="pt-2 border-t border-zinc-800/80">
              <span className="text-[11px] font-mono-digits text-zinc-400 block mb-1">
                {submission.category === 'writing' ? 'WRITTEN PIECE / NOTES' : 'CREATOR NOTES'}
              </span>
              <p className="text-sm text-zinc-300 bg-zinc-950 p-4 rounded-lg border border-zinc-800/60 whitespace-pre-wrap font-sans leading-relaxed">
                {submission.submissionText || submission.notes}
              </p>
            </div>
          )}
        </div>

        <div className="text-xs font-mono-digits text-zinc-500 text-center flex items-center justify-center gap-1.5 pt-2">
          <Lock className="w-3.5 h-3.5 text-zinc-400" />
          <span>Locked in fate and synced to database. Submission cannot be edited.</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Open submission form
  // -------------------------------------------------------------
  return (
    <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 space-y-6 text-left shadow-2xl">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="inline-flex items-center space-x-2 text-xs font-mono-digits text-[#ff3b30] uppercase tracking-widest mb-1.5">
          <Upload className="w-3.5 h-3.5" />
          <span>FINAL STEP • SUBMIT BEFORE CLOCK RUNS OUT</span>
        </div>
        <h3 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
          SHOW US WHAT YOU MADE
        </h3>
        <p className="text-zinc-400 text-sm mt-1">
          {category === 'design'
            ? 'Upload your artwork, visual export, or link your live Figma/Behance canvas.'
            : 'Write your piece directly below, upload a document, or share your publication link.'}
        </p>
      </div>

      {/* Locked Challenge Pill */}
      {challenge && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono-digits">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-[#ff3b30]" />
            <span className="text-zinc-400 uppercase tracking-wider">LOCKED CHALLENGE:</span>
            <span className="text-white font-bold">
              #{challenge.id} {challenge.title}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold uppercase text-[10px]">
            {category}
          </span>
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

        {/* Category-Specific Primary Input: Writing Area if Writing */}
        {category === 'writing' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono-digits uppercase text-zinc-300 tracking-wider">
                Your Written Piece
              </label>
              <div className="text-[11px] font-mono-digits text-zinc-500">
                {writingText.trim() ? writingText.trim().split(/\s+/).length : 0} words •{' '}
                {writingText.length} chars
              </div>
            </div>
            <textarea
              rows={7}
              disabled={isSubmitting}
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              placeholder="Write your response here, explore the theme, or paste your draft..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-sans leading-relaxed"
            />
          </div>
        )}

        {/* File Upload Dropzone (Max 20MB) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono-digits uppercase text-zinc-300 tracking-wider">
              {category === 'design' ? 'Upload Design File' : 'Upload Document'}
              <span className="text-zinc-500 font-normal ml-2">(Max 20 MB)</span>
            </label>
            {selectedFile && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-xs font-mono-digits text-red-400 hover:underline"
              >
                Remove file
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
              if (!isSubmitting && e.dataTransfer.files && e.dataTransfer.files[0]) {
                validateAndSetFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => {
              if (!isSubmitting) fileInputRef.current?.click();
            }}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-white bg-zinc-900'
                : selectedFile
                ? 'border-emerald-600/70 bg-emerald-950/15'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              disabled={isSubmitting}
              className="hidden"
              accept={
                category === 'design'
                  ? 'image/png,image/jpeg,image/webp,application/pdf'
                  : 'application/pdf,.docx,.doc,.txt,.md'
              }
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  validateAndSetFile(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <FileCheck className="w-8 h-8 text-emerald-400" />
                <div className="text-sm font-mono-digits text-white font-semibold flex items-center gap-1.5">
                  <span>{selectedFile.name}</span>
                  <span className="text-zinc-400 text-xs font-normal">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Click or drag to replace this file</p>

                {filePreviewUrl && (
                  <div className="mt-3 max-h-48 overflow-hidden rounded-lg border border-zinc-700 bg-black/60 p-2">
                    <img
                      src={filePreviewUrl}
                      alt="Selected preview"
                      className="max-h-40 object-contain rounded"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
                  {category === 'design' ? (
                    <ImageIcon className="w-5 h-5 text-[#ff3b30]" />
                  ) : (
                    <FileText className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="text-sm font-medium text-zinc-200">
                  <span className="font-semibold text-white underline">Click to browse</span> or drag and drop
                </div>
                <p className="text-xs font-mono-digits text-zinc-500">
                  {category === 'design'
                    ? 'Supported: PNG, JPG, JPEG, WEBP, PDF (up to 20MB)'
                    : 'Supported: PDF, DOC, DOCX, TXT, MD (up to 20MB)'}
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
                  ? 'https://figma.com/..., behance.net/..., or x.com/...'
                  : 'https://medium.com/..., notion.so/..., substack.com/...'
              }
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors font-mono-digits"
            />
            <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-[11px] font-mono-digits text-zinc-500">
            {category === 'design'
              ? 'Figma, Behance, Dribbble, X/Twitter, GitHub, or live URL'
              : 'Medium, Google Docs, Notion, Substack, blog, or shared drive'}
          </p>
        </div>

        {/* Additional Notes (Optional) */}
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

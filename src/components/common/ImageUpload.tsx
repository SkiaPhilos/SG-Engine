import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Link, Check, AlertCircle } from 'lucide-react';
import { uploadToStorage } from '../../services/supabase/storage';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
  aspectRatio?: 'square' | 'video' | 'banner' | 'auto';
  maxDimension?: number;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label,
  helperText,
  aspectRatio = 'square',
  maxDimension = 1000,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress image using HTML Canvas, then upload to Supabase Storage
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP, SVG).');
      return;
    }

    setProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = async () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let dataUrl = e.target?.result as string;

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          // Upload to Supabase Storage bucket 'store-assets'
          const cleanName = `asset_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const finalUrl = await uploadToStorage('store-assets', dataUrl, cleanName);
          onChange(finalUrl);
        } catch (err: any) {
          console.warn('Image optimization/upload failed, using fallback data URL:', err);
          onChange(e.target?.result as string);
        } finally {
          setProcessing(false);
        }
      };

      img.onerror = () => {
        setError('Failed to load image file.');
        setProcessing(false);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setError('Failed to read file.');
      setProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setShowUrlInput(false);
      setUrlDraft('');
    }
  };

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'banner'
      ? 'aspect-[21/9]'
      : 'min-h-[140px]';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <Link className="w-3 h-3" />
            <span>{showUrlInput ? 'Upload file instead' : 'Or paste URL'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showUrlInput ? (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/image.png"
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Apply
          </button>
        </div>
      ) : value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
          <div className={`${aspectClass} w-full flex items-center justify-center`}>
            <img
              src={value}
              alt="Uploaded visual"
              className="w-full h-full object-contain p-2"
            />
          </div>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-neutral-900 shadow-md hover:bg-neutral-100"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-850/50'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              {processing ? (
                <div className="w-5 h-5 border-2 border-neutral-400 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {processing ? 'Optimizing image...' : 'Click or drop image here'}
              </p>
              <p className="text-[11px] text-neutral-400">
                {helperText || 'PNG, JPG, WebP or SVG from your device'}
              </p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

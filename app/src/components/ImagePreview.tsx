'use client';

import { useState } from 'react';
import type { RenderedImage } from '@/types';

interface ImagePreviewProps {
  images: RenderedImage[];
  onClose: () => void;
}

export default function ImagePreview({ images, onClose }: ImagePreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Guard: close if no images
  const currentImage = images[currentImageIndex];
  if (!currentImage) {
    onClose();
    return null;
  }

  async function downloadImage(url: string, filename: string) {
    try {
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Download API error:', errorData);
        alert('Lỗi khi tải ảnh. Vui lòng thử lại.');
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error('Download API returned error:', errorData);
        alert('Lỗi khi tải ảnh. Vui lòng thử lại.');
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Lỗi khi tải ảnh. Vui lòng thử lại.');
    }
  }

  async function downloadAll() {
    setDownloading(true);
    for (const image of images) {
      await downloadImage(image.url, image.filename);
      await new Promise(r => setTimeout(r, 500));
    }
    setDownloading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm overlay-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-surface rounded-2xl shadow-modal modal-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h3 className="text-base font-semibold text-text-primary">
            {images.length > 1 ? `Ảnh đã tạo (${currentImageIndex + 1}/${images.length})` : 'Ảnh đã tạo'}
          </h3>
          <button
            onClick={onClose}
            className="btn-icon"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image Carousel */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative">
            {images.length > 1 && (
              <>
                {/* Navigation dots */}
                <div className="flex justify-center gap-2 mb-4">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`nav-dot ${index === currentImageIndex ? 'active' : ''}`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation arrows */}
                <button
                  onClick={() => setCurrentImageIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 btn-nav-arrow"
                  aria-label="Previous image"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentImageIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 btn-nav-arrow"
                  aria-label="Next image"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </>
            )}

            {/* Current image */}
            <div className="rounded-xl overflow-hidden border border-border-light bg-surface-tertiary">
              {currentImage.playerName && (
                <div className="px-4 py-3 border-b border-border-light bg-surface">
                  <p className="text-sm font-medium text-text-primary">
                    {currentImage.playerName}
                  </p>
                </div>
              )}
              <img
                src={currentImage.url}
                alt={currentImage.filename}
                className="w-full h-auto"
              />
            </div>

            {/* Download current button */}
            <button
              onClick={() => downloadImage(currentImage.url, currentImage.filename)}
              className="w-full mt-4 btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Tải về
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border-light p-4 bg-surface-tertiary/30 space-y-2">
          {images.length > 1 && (
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="w-full btn-secondary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="spinner-dark w-4 h-4" />
                  Đang tải {images.length} ảnh...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Tải tất cả ({images.length} ảnh)
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-text-close"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

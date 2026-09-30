import React from 'react';
import { X, Download, ExternalLink, Trash2 } from 'lucide-react';

export default function ImageViewerModal({ isOpen, onClose, imageUrl, title, onDelete }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs screen-only">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-800">
              {title || 'Masraf Belgesi / Fiş Görseli'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              title="Yeni Sekmede Aç"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Bu fiş görselini silmek istediğinize emin misiniz?')) {
                    onDelete();
                    onClose();
                  }
                }}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                title="Görseli Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/90">
          <img
            src={imageUrl}
            alt={title || 'Fiş Belgesi'}
            className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}

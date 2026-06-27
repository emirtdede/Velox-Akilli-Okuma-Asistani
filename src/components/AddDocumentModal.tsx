/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { extractTextFromPdf, extractTextFromDocx, extractTextFromEpub } from '../utils/parsers';
import { FileText, FileDown, UploadCloud, Globe, RefreshCw, X, AlertTriangle } from 'lucide-react';

interface AddDocumentModalProps {
  onClose: () => void;
  onAdd: (title: string, content: string, tags?: string[]) => void;
}

export default function AddDocumentModal({ onClose, onAdd }: AddDocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'url'>('upload');
  
  // Paste states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // URL states
  const [url, setUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  
  // Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse TXT/MD files
  const handleTxtMdFile = (file: File) => {
    setLoadingPercent(20);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLoadingPercent(80);
      const text = e.target?.result as string;
      if (text.trim().length === 0) {
        setUploadError('Yüklediğiniz dosya boş çıktı.');
        setLoadingPercent(null);
        return;
      }
      onAdd(file.name.replace(/\.[^/.]+$/, ""), text, [file.name.split('.').pop()?.toUpperCase() || 'Dosya']);
      setLoadingPercent(null);
      onClose();
    };
    reader.onerror = () => {
      setUploadError('Dosya okuma sırasında hata oluştu.');
      setLoadingPercent(null);
    };
    reader.readAsText(file);
  };

  // Parse PDF files
  const handlePdfFile = async (file: File) => {
    try {
      setLoadingPercent(5);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const text = await extractTextFromPdf(buffer, (percent) => {
            setLoadingPercent(percent);
          });
          
          if (!text || text.trim().length < 10) {
            throw new Error('PDF dosyasından okunabilir düzenli bir metin çıkarılamadı.');
          }

          onAdd(file.name.replace(/\.[^/.]+$/, ""), text, ['PDF']);
          setLoadingPercent(null);
          onClose();
        } catch (err: any) {
          setUploadError(err.message || 'PDF ayrıştırılırken bilinmeyen bir hata meydana geldi.');
          setLoadingPercent(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setUploadError('Dosya okunurken hata oluştu.');
      setLoadingPercent(null);
    }
  };

  // Parse DOCX files
  const handleDocxFile = async (file: File) => {
    try {
      setLoadingPercent(10);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setLoadingPercent(50);
          const buffer = e.target?.result as ArrayBuffer;
          const text = await extractTextFromDocx(buffer);
          
          if (!text || text.trim().length === 0) {
            throw new Error('Word dosyasının içi boş görünüyor.');
          }
          
          setLoadingPercent(90);
          onAdd(file.name.replace(/\.[^/.]+$/, ""), text, ['DOCX']);
          setLoadingPercent(null);
          onClose();
        } catch (err: any) {
          setUploadError(err.message || 'Word dosyası okunamadı.');
          setLoadingPercent(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setUploadError('Dosya okunurken hata oluştu.');
      setLoadingPercent(null);
    }
  };

  // Parse EPUB files
  const handleEpubFile = async (file: File) => {
    try {
      setLoadingPercent(10);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const text = await extractTextFromEpub(buffer, (percent) => {
            setLoadingPercent(percent);
          });
          
          if (!text || text.trim().length === 0) {
            throw new Error('EPUB kitabından okunabilir bir metin çıkarılamadı.');
          }
          
          onAdd(file.name.replace(/\.[^/.]+$/, ""), text, ['EPUB', 'Kitap']);
          setLoadingPercent(null);
          onClose();
        } catch (err: any) {
          setUploadError(err.message || 'EPUB dosyası ayrıştırılamadı.');
          setLoadingPercent(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setUploadError('Dosya okunurken hata oluştu.');
      setLoadingPercent(null);
    }
  };

  // Dispatch processing
  const processUploadedFile = (file: File) => {
    setUploadError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'txt' || extension === 'md') {
      handleTxtMdFile(file);
    } else if (extension === 'pdf') {
      handlePdfFile(file);
    } else if (extension === 'docx') {
      handleDocxFile(file);
    } else if (extension === 'epub') {
      handleEpubFile(file);
    } else {
      setUploadError('Desteklenmeyen dosya formatı. Lütfen PDF, DOCX, EPUB, TXT veya MD dosyası yükleyin.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Manual Paste Add
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd(title.trim() || 'Başlıksız Metin', content, ['Yapıştırılan']);
    onClose();
  };

  // URL Scraper Submit
  const handleUrlFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsFetchingUrl(true);
    setUploadError(null);
    
    try {
      const response = await fetch('/api/content/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Adres okunamadı.');
      }
      
      onAdd(data.title || 'URL Okuma', data.text, ['Web']);
      onClose();
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Web sayfasından veri çekilemedi. Adres korumalı veya erişilemez olabilir.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-document-modal"
        className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-zinc-800 rounded-3xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-150 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
            <FileDown className="w-5 h-5 text-indigo-600" />
            Okuma Belgesi Ekle
          </h3>
          <button 
            onClick={onClose}
            className="p-1 px-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-stone-150 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950/40 p-1 m-2 rounded-xl">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeTab === 'upload' 
                ? 'bg-white dark:bg-stone-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700'
            }`}
          >
            Dosya Yükle
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeTab === 'paste' 
                ? 'bg-white dark:bg-stone-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700'
            }`}
          >
            Metin Yapıştır
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeTab === 'url' 
                ? 'bg-white dark:bg-stone-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700'
            }`}
          >
            Web URL'si
          </button>
        </div>

        {/* Errors view */}
        {uploadError && (
          <div className="mx-5 my-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* Tab 1: Upload */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              {loadingPercent !== null ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
                    Dosya Ayrıştırılıyor...
                  </span>
                  <div className="w-1/2 h-2 rounded-full bg-stone-100 overflow-hidden mt-1">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${loadingPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-500">% {loadingPercent}</span>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/25' 
                        : 'border-stone-200 hover:border-indigo-400 dark:border-zinc-800 hover:bg-stone-50/40'
                    }`}
                  >
                    <UploadCloud className="w-10 h-10 text-stone-400 dark:text-zinc-500 mb-3" />
                    <span className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
                      Sürükleyip Bırakın veya Tıklayın
                    </span>
                    <span className="text-xs text-stone-400 mt-1">
                      Desteklenen formatlar: EPUB (.epub), PDF, Word (.docx), TXT veya Markdown (.md)
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".epub,.pdf,.docx,.txt,.md"
                      className="hidden"
                    />
                  </div>
                  
                  <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/50 dark:bg-zinc-950/10 dark:border-zinc-900 rounded-xl">
                    <h5 className="text-xs font-semibold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Client-Side Gizlilik Önceliği
                    </h5>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      Yüklediğiniz kitap veya pdf dosyaları hiçbir uzak sunucuya yüklenmez, doğrudan tarayıcınızda yerel bellek üzerinden çözümlenir ve kütüphanenizde saklanır.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Paste */}
          {activeTab === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Belge Başlığı</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Seçmeli (örn: Sapiens - Özet)"
                  className="w-full mt-1 px-3 py-2 text-sm border border-stone-200 dark:border-zinc-800 bg-white dark:bg-stone-900 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-stone-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Metin İçeriği</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder="Okumak istediğiniz metni buraya yapıştırın veya yazın..."
                  className="w-full mt-1 p-3 text-sm border border-stone-200 dark:border-zinc-800 bg-white dark:bg-stone-900 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-stone-900 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={!content.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Kütüphaneye Ekle
              </button>
            </form>
          )}

          {/* Tab 3: URL Web-scraping */}
          {activeTab === 'url' && (
            <form onSubmit={handleUrlFetch} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Makale veya Blog Sayfası Adresi</label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-2.5 w-4.5 h-4.5 text-stone-400" />
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://anadolutr.com/makale-basligi"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 dark:border-zinc-800 bg-white dark:bg-stone-900 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-stone-900 dark:text-zinc-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isFetchingUrl || !url.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                  >
                    {isFetchingUrl ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Çek ve Ekle'
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-stone-400 leading-relaxed mt-1.5 block">
                  Web sayfasındaki reklamlar, menüler ve şablon artıkları otomatik olarak ayırt edilecek; sadece ana okuma metni kütüphanenize eklenecektir.
                </span>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

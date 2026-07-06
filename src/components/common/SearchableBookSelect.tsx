/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from '../../utils/i18n';

export function SearchableBookSelect({
  books,
  selectedBookId,
  onSelectBook,
  isLightTheme,
  surfaceClass,
  mutedClass,
  titleClass
}: any) {
  const { lang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedBook = books.find((b: any) => b.id === selectedBookId);
  const localizedSelectedBook = selectedBook && selectedBook.id === 'sample-welcome' && lang !== 'tr'
    ? { ...selectedBook, title: 'Velox Speed Reading Guide' }
    : selectedBook;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBooks = useMemo(() => {
    return books.filter((b: any) =>
      (b.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : b.title).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [books, searchQuery, lang]);

  return (
    <div className="relative w-full mt-2" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen(!isOpen); setSearchQuery(''); }}
        type="button"
        className={`w-full h-11 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between text-left focus:outline-none focus:border-indigo-500 ${
          isLightTheme 
            ? 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50' 
            : 'border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900/20'
        }`}
      >
        <span className="truncate pr-2">{localizedSelectedBook ? (localizedSelectedBook.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : localizedSelectedBook.title) : (lang === 'tr' ? 'Metin Seçilmedi' : 'No text selected')}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute left-0 right-0 mt-1.5 z-40 rounded-2xl border p-2 flex flex-col gap-2 max-h-60 shadow-2xl ${
            isLightTheme 
              ? 'border-stone-200 bg-white shadow-stone-200/50' 
              : 'border-zinc-800 bg-zinc-950 shadow-black/80'
          }`}
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-60" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'tr' ? 'Belge adıyla ara...' : 'Search by document name...'}
              className={`w-full h-9 pl-8 pr-3 rounded-xl border text-xs outline-none focus:border-indigo-500 ${
                isLightTheme 
                  ? 'border-stone-200 bg-stone-50 text-stone-900' 
                  : 'border-zinc-850 bg-zinc-900 text-zinc-100'
              }`}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-note-scrollbar flex flex-col gap-1 pr-1">
            {filteredBooks.length === 0 ? (
              <span className={`text-[11px] p-2 text-center ${mutedClass}`}>{lang === 'tr' ? 'Metin bulunamadı' : 'No text found'}</span>
            ) : (
              filteredBooks.map((b: any) => {
                const isSelected = b.id === selectedBookId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectBook(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-lg text-xs font-bold text-left transition-all truncate ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : isLightTheme
                        ? 'hover:bg-stone-100 text-stone-800'
                        : 'hover:bg-zinc-900 text-zinc-200'
                    }`}
                  >
                    {b.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : b.title}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, Scale, Shield, Heart, ChevronRight } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { LegalModal } from '../components/modals/LegalModal';

export function AboutPage({
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  const { t, lang } = useTranslation();
  const [activeModal, setActiveModal] = useState<'eula' | 'privacy' | 'licenses' | null>(null);

  const handleOpenLink = () => {
    window.open('https://vellium.dev', '_blank');
  };

  return (
    <section className="flex flex-col items-center justify-center py-4 px-4 max-w-3xl mx-auto w-full">
      {/* App Logo & Name */}
      <div className="flex flex-col items-center text-center">
        <img src="/velox-icon.svg" alt="Velox Logo" className="w-48 h-48 object-contain -mb-5" />
        <h2 className={`text-3xl font-black tracking-tight ${titleClass}`}>Velox</h2>
        <p className={`text-sm mt-2 max-w-md leading-relaxed ${mutedClass}`}>
          {t('about_desc')}
        </p>
      </div>

      {/* Developer Card */}
      <div className={`w-full mt-6 rounded-2xl border p-4 ${surfaceClass} flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 grid place-items-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
            <img src="/vellium-icon.svg" alt="Vellium Logo" className="w-7 h-7 filter drop-shadow-[0_0_4px_rgba(129,140,248,0.6)]" />
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{t('about_author')}</p>
            <h3 className={`text-sm font-black ${titleClass}`}>Vellium.dev</h3>
            <a href="https://vellium.dev" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">vellium.dev</a>
          </div>
        </div>
        <button
          onClick={handleOpenLink}
          className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLightTheme ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
        >
          {lang === 'tr' ? 'Web Sitesi' : 'Website'} <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>

      {/* Legal List */}
      <div className={`w-full mt-6 rounded-2xl border p-5 ${surfaceClass}`}>
        <p className={`text-[10px] font-black uppercase tracking-wider ${mutedClass} mb-4`}>{lang === 'tr' ? 'YASAL' : 'LEGAL'}</p>
        <div className="flex flex-col divide-y divide-stone-200 dark:divide-zinc-800/60">
          {/* EULA */}
          <button
            onClick={() => setActiveModal('eula')}
            className="py-4 flex items-center justify-between text-left w-full hover:opacity-85"
          >
            <div className="flex items-center gap-3">
              <Scale className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className={`text-sm font-black ${titleClass}`}>{lang === 'tr' ? 'Kullanım Koşulları (EULA)' : 'Terms of Use (EULA)'}</h4>
                <p className={`text-xs mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Son kullanıcı lisans sözleşmesi' : 'End user license agreement'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* Privacy */}
          <button
            onClick={() => setActiveModal('privacy')}
            className="py-4 flex items-center justify-between text-left w-full hover:opacity-85"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className={`text-sm font-black ${titleClass}`}>{lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}</h4>
                <p className={`text-xs mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Veri toplama ve gizlilik bilgileri' : 'Data collection and privacy information'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* Licenses */}
          <button
            onClick={() => setActiveModal('licenses')}
            className="py-4 flex items-center justify-between text-left w-full hover:opacity-85"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className={`text-sm font-black ${titleClass}`}>{lang === 'tr' ? 'Açık Kaynak Lisansları' : 'Open Source Licenses'}</h4>
                <p className={`text-xs mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Üçüncü parti yazılım bildirimleri' : 'Third-party software notices'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>
        </div>
      </div>

      {/* Legal Footer Info */}
      <div className="mt-8 text-center flex flex-col gap-2">
        <p className={`text-xs ${mutedClass}`}>{lang === 'tr' ? 'Copyright © 2026 Vellium. Tüm hakları saklıdır.' : 'Copyright © 2026 Vellium. All rights reserved.'}</p>
        <p className={`text-[10px] leading-relaxed max-w-md ${mutedClass} opacity-60`}>
          {lang === 'tr'
            ? 'Velox tescilli bir yazılımdır. İzinsiz kopyalanması, dağıtılması veya tersine mühendislik yapılması kesinlikle yasaktır.'
            : 'Velox is a proprietary software. Unauthorized copying, distribution, or reverse engineering is strictly prohibited.'}
        </p>
      </div>

      {/* Modal */}
      {activeModal && (
        <LegalModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
          isLightTheme={isLightTheme}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
        />
      )}
    </section>
  );
}

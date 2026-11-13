'use client';

import { useEffect, useId, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { defaultFounder, validateFounder } from '@/lib/account/homepage-content';
import FounderSocials from './founder-socials';
import './play-first-home.css';

const labels = {
  zh: { title: '认识创始人', follow: '关注 Serina · 社交平台' },
  en: { title: 'Meet the founder', follow: 'Follow Serina' },
  fr: { title: 'La fondatrice', follow: 'Suivre Serina' },
};

export default function FounderIntro() {
  const locale = useLocale();
  const heading = useId();
  const [founder, setFounder] = useState(defaultFounder);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/homepage', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        const content = validateFounder(data?.founder);
        if (content && !controller.signal.aborted) setFounder(content);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return <section className="landing-founder" aria-labelledby={heading}>
    <img src="/homepage/serina.jpg" alt={founder.name} width={640} height={640} loading="lazy"/>
    <div>
      <small>{labels[locale].title}</small>
      <h2 id={heading}>{founder.name}</h2>
      <strong>{founder[locale].credential}</strong>
      <p>{founder[locale].story}</p>
      {founder.instagram && <a className="secondary" href={founder.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}
    </div>
    <details className="founder-social-details">
      <summary>{labels[locale].follow}</summary>
      <FounderSocials/>
    </details>
  </section>;
}

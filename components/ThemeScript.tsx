import { headers } from 'next/headers';

/**
 * Script inline injecté avant l'hydratation pour appliquer le thème sans flash.
 * Lit la préférence depuis localStorage ou tombe sur "system".
 * Le `nonce` provient du proxy CSP afin de respecter `strict-dynamic`.
 */
const themeScript = `(function(){try{var k='jmv-theme';var pref=localStorage.getItem(k)||'system';var root=document.documentElement;root.classList.add('jmv-theme-loading');if(pref==='light'||pref==='dark'){root.setAttribute('data-theme',pref);}else{root.removeAttribute('data-theme');}requestAnimationFrame(function(){root.classList.remove('jmv-theme-loading');});}catch(_){}})();`;

export async function ThemeScript() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script
      nonce={nonce}
      // Le navigateur efface l'attribut `nonce` du DOM après parsing HTML
      // (politique CSP) → React lit `nonce=""` à l'hydratation. On supprime
      // l'avertissement, le script ne se re-rend jamais.
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: inline script before hydration to avoid theme flash
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}

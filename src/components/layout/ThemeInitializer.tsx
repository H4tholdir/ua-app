// Script inline che applica il tema PRIMA del render per evitare FOUC
// (Flash of Unstyled Content / Flash of Wrong Theme)
// SECURITY NOTE: dangerouslySetInnerHTML is safe here — content is a static
// string literal with no user input, no interpolation, no external data.

export function ThemeInitializer() {
  const script = `(function(){try{var s=localStorage.getItem('ua-theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  )
}

// Script inline che applica il tema PRIMA del render per evitare FOUC
// SECURITY NOTE: dangerouslySetInnerHTML is safe — static string, no user input.

export function ThemeInitializer() {
  const script = `(function(){try{
    var s=localStorage.getItem('ua-theme');
    var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}
    else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}
  }catch(e){}})();`
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  )
}

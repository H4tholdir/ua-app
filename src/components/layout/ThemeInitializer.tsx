// Script inline che applica il tema PRIMA del render per evitare FOUC, e che da
// qui in avanti tiene allineato anche il colore della barra di stato di sistema.
// SECURITY NOTE: dangerouslySetInnerHTML is safe — static string, no user input.
//
// Perche' il colore della barra sta QUI e non in un componente client: questo script
// e' sincrono in <head>, quindi gira prima della prima pittura. Un componente React
// arriverebbe dopo l'idratazione, cioe' dopo che l'utente ha gia' visto il colore
// sbagliato.
//
// ATTENZIONE: dentro la stringa dello script NON si possono usare backtick nei
// commenti — chiudono il template literal e producono un TS1381 oscuro. Apici singoli.
import { COLORE_BARRA } from '@/design-system/colore-barra-sistema'

export const SCRIPT_TEMA = `(function(){try{
  var s=localStorage.getItem('ua-theme');
  var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var h=document.documentElement;
  if(d){h.classList.add('dark');h.setAttribute('data-theme','dark');}
  else{h.classList.remove('dark');h.setAttribute('data-theme','light');}
  var CHIARO='${COLORE_BARRA.light}',SCURO='${COLORE_BARRA.dark}';
  function barra(){
    /* la condizione e' 'dark' ? scuro : chiaro — mai il contrario: data-theme puo'
       essere ASSENTE (ds-v3-catalogo lo rimuove), e assente significa chiaro. */
    var c=h.getAttribute('data-theme')==='dark'?SCURO:CHIARO;
    var m=document.querySelectorAll('meta[name="theme-color"]');
    if(!m.length){
      var n=document.createElement('meta');
      n.setAttribute('name','theme-color');
      n.setAttribute('content',c);
      document.head.appendChild(n);
      return;
    }
    for(var i=0;i<m.length;i++){m[i].setAttribute('content',c);}
  }
  barra();
  new MutationObserver(barra).observe(h,{attributes:true,attributeFilter:['data-theme']});
}catch(e){}})();`

export function ThemeInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }}
    />
  )
}

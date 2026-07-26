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

export const SCRIPT_TEMA = `(function(){
  /* Lo storage sta in un try SUO: se lancia (privacy del browser, cookie bloccati,
     WebView, policy aziendali) si degrada al tema di sistema. In un try unico
     faceva cadere tutto il resto — niente tema, niente classe, niente meta — e da
     quando layout.tsx non dichiara piu' themeColor non ci sarebbe nemmeno piu' un
     colore di riserva nell'HTML. Misurato in review, non ipotizzato. */
  var m=null;
  try{
    m=localStorage.getItem('ua-tema');
    /* la chiave vecchia si ignora E si cancella: conteneva light/dark scritti da un
       interruttore a DUE stati, dove 'Automatico' non era nemmeno offerto. Quel
       valore non esprime la volonta' di bloccare il tema. V. lib/preferenze/tema.ts */
    localStorage.removeItem('ua-theme');
  }catch(e){}
  try{
  var sis=!!window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  /* SECONDA COPIA di risolviTema (lib/preferenze/tema.ts): una stringa iniettata non
     puo' importare. Un valore non riconosciuto vale quanto nessun valore -> si segue
     il telefono. Le due copie sono confrontate su ogni combinazione in
     tests/unit/colore-barra-sistema.test.ts. */
  var d=m==='scuro'||(m!=='chiaro'&&sis);
  var h=document.documentElement;
  if(d){h.classList.add('dark');h.setAttribute('data-theme','dark');}
  else{h.classList.remove('dark');h.setAttribute('data-theme','light');}
  var CHIARO='${COLORE_BARRA.light}',SCURO='${COLORE_BARRA.dark}';
  function barra(){
    /* la condizione e' 'dark' ? scuro : chiaro — mai il contrario: data-theme puo'
       essere ASSENTE (ds-v3-catalogo lo rimuove), e assente significa chiaro. */
    var c=h.getAttribute('data-theme')==='dark'?SCURO:CHIARO;
    /* si scrivono TUTTI i meta trovati. Oggi ce n'e' al massimo uno; se un domani
       tornasse la forma a coppia chiaro/scuro con l'attributo media, questo ciclo
       li porterebbe entrambi allo stesso valore annullando la distinzione. */
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

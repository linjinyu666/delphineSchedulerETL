import{s as ne}from"./service.a1d4770e.js";import{S as Y,aA as te,g as C,a6 as G,k,l as B,n as W,p as Q,d as H,b as X,r as N,o as q,G as P,X as E,e as O,t as Z,h as d,a5 as le,aF as re,O as se,V as ie,a2 as V,Q as ae,T as ce,Z as D,u as ue,D as de,be as fe,H as he,c as A}from"./index.e2a499a0.js";import{M as me}from"./index.777983c2.js";import{D as ge}from"./DownloadOutlined.179a6cd6.js";import{S as be}from"./SyncOutlined.4f88c208.js";import{F as ve,a as pe}from"./FullscreenOutlined.b83f016e.js";import{u as we}from"./use-locale.c60aec6e.js";import{f as xe}from"./fade-in-scale-up.cssr.d770f4c4.js";import{t as je}from"./throttle.c81d3662.js";import{N as Re}from"./Scrollbar.632c53f6.js";import{N as $e}from"./Icon.a3fc0ddd.js";function J(e,o){const n=Y(te,null);return C(()=>e.hljs||(n==null?void 0:n.mergedHljsRef.value))}const Ce=e=>{const{textColor2:o,fontSize:n,fontWeightStrong:t,textColor3:l}=e;return{textColor:o,fontSize:n,fontWeightStrong:t,"mono-3":"#a0a1a7","hue-1":"#0184bb","hue-2":"#4078f2","hue-3":"#a626a4","hue-4":"#50a14f","hue-5":"#e45649","hue-5-2":"#c91243","hue-6":"#986801","hue-6-2":"#c18401",lineNumberTextColor:l}},Le={name:"Code",common:G,self:Ce},ee=Le,Se=k([B("code",`
 font-size: var(--n-font-size);
 font-family: var(--n-font-family);
 `,[W("show-line-numbers",`
 display: flex;
 `),Q("line-numbers",`
 user-select: none;
 padding-right: 12px;
 text-align: right;
 transition: color .3s var(--n-bezier);
 color: var(--n-line-number-text-color);
 `),W("word-wrap",[k("pre",`
 white-space: pre-wrap;
 word-break: break-all;
 `)]),k("pre",`
 margin: 0;
 line-height: inherit;
 font-size: inherit;
 font-family: inherit;
 `),k("[class^=hljs]",`
 color: var(--n-text-color);
 transition: 
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `)]),({props:e})=>{const o=`${e.bPrefix}code`;return[`${o} .hljs-comment,
 ${o} .hljs-quote {
 color: var(--n-mono-3);
 font-style: italic;
 }`,`${o} .hljs-doctag,
 ${o} .hljs-keyword,
 ${o} .hljs-formula {
 color: var(--n-hue-3);
 }`,`${o} .hljs-section,
 ${o} .hljs-name,
 ${o} .hljs-selector-tag,
 ${o} .hljs-deletion,
 ${o} .hljs-subst {
 color: var(--n-hue-5);
 }`,`${o} .hljs-literal {
 color: var(--n-hue-1);
 }`,`${o} .hljs-string,
 ${o} .hljs-regexp,
 ${o} .hljs-addition,
 ${o} .hljs-attribute,
 ${o} .hljs-meta-string {
 color: var(--n-hue-4);
 }`,`${o} .hljs-built_in,
 ${o} .hljs-class .hljs-title {
 color: var(--n-hue-6-2);
 }`,`${o} .hljs-attr,
 ${o} .hljs-variable,
 ${o} .hljs-template-variable,
 ${o} .hljs-type,
 ${o} .hljs-selector-class,
 ${o} .hljs-selector-attr,
 ${o} .hljs-selector-pseudo,
 ${o} .hljs-number {
 color: var(--n-hue-6);
 }`,`${o} .hljs-symbol,
 ${o} .hljs-bullet,
 ${o} .hljs-link,
 ${o} .hljs-meta,
 ${o} .hljs-selector-id,
 ${o} .hljs-title {
 color: var(--n-hue-2);
 }`,`${o} .hljs-emphasis {
 font-style: italic;
 }`,`${o} .hljs-strong {
 font-weight: var(--n-font-weight-strong);
 }`,`${o} .hljs-link {
 text-decoration: underline;
 }`]}]),ye=Object.assign(Object.assign({},O.props),{language:String,code:{type:String,default:""},trim:{type:Boolean,default:!0},hljs:Object,uri:Boolean,inline:Boolean,wordWrap:Boolean,showLineNumbers:Boolean,internalFontSize:Number,internalNoHighlight:Boolean}),Fe=H({name:"Code",props:ye,setup(e,{slots:o}){const{internalNoHighlight:n}=e,{mergedClsPrefixRef:t,inlineThemeDisabled:l}=X(),r=N(null),p=n?{value:void 0}:J(e),w=(s,f,u)=>{const{value:h}=p;return!h||!(s&&h.getLanguage(s))?null:h.highlight(u?f.trim():f,{language:s}).value},S=C(()=>e.inline||e.wordWrap?!1:e.showLineNumbers),v=()=>{if(o.default)return;const{value:s}=r;if(!s)return;const{language:f}=e,u=e.uri?window.decodeURIComponent(e.code):e.code;if(f){const c=w(f,u,e.trim);if(c!==null){if(e.inline)s.innerHTML=c;else{const i=s.querySelector(".__code__");i&&s.removeChild(i);const a=document.createElement("pre");a.className="__code__",a.innerHTML=c,s.appendChild(a)}return}}if(e.inline){s.textContent=u;return}const h=s.querySelector(".__code__");if(h)h.textContent=u;else{const c=document.createElement("pre");c.className="__code__",c.textContent=u,s.innerHTML="",s.appendChild(c)}};q(v),P(E(e,"language"),v),P(E(e,"code"),v),n||P(p,v);const y=O("Code","-code",Se,ee,e,t),F=C(()=>{const{common:{cubicBezierEaseInOut:s,fontFamilyMono:f},self:{textColor:u,fontSize:h,fontWeightStrong:c,lineNumberTextColor:i,"mono-3":a,"hue-1":j,"hue-2":R,"hue-3":m,"hue-4":T,"hue-5":z,"hue-5-2":M,"hue-6":$,"hue-6-2":g}}=y.value,{internalFontSize:I}=e;return{"--n-font-size":I?`${I}px`:h,"--n-font-family":f,"--n-font-weight-strong":c,"--n-bezier":s,"--n-text-color":u,"--n-mono-3":a,"--n-hue-1":j,"--n-hue-2":R,"--n-hue-3":m,"--n-hue-4":T,"--n-hue-5":z,"--n-hue-5-2":M,"--n-hue-6":$,"--n-hue-6-2":g,"--n-line-number-text-color":i}}),x=l?Z("code",C(()=>`${e.internalFontSize||"a"}`),F,e):void 0;return{mergedClsPrefix:t,codeRef:r,mergedShowLineNumbers:S,lineNumbers:C(()=>{let s=1;const f=[];let u=!1;for(const h of e.code)h===`
`?(u=!0,f.push(s++)):u=!1;return u||f.push(s++),f.join(`
`)}),cssVars:l?void 0:F,themeClass:x==null?void 0:x.themeClass,onRender:x==null?void 0:x.onRender}},render(){var e,o;const{mergedClsPrefix:n,wordWrap:t,mergedShowLineNumbers:l,onRender:r}=this;return r==null||r(),d("code",{class:[`${n}-code`,this.themeClass,t&&`${n}-code--word-wrap`,l&&`${n}-code--show-line-numbers`],style:this.cssVars,ref:"codeRef"},l?d("pre",{class:`${n}-code__line-numbers`},this.lineNumbers):null,(o=(e=this.$slots).default)===null||o===void 0?void 0:o.call(e))}}),Te=e=>{const{textColor2:o,modalColor:n,borderColor:t,fontSize:l,primaryColor:r}=e;return{loaderFontSize:l,loaderTextColor:o,loaderColor:n,loaderBorder:`1px solid ${t}`,loadingColor:r}},ze=le({name:"Log",common:G,peers:{Scrollbar:re,Code:ee},self:Te}),Me=ze,ke=H({name:"LogLoader",props:{clsPrefix:{type:String,required:!0}},setup(){return{locale:we("Log").localeRef}},render(){const{clsPrefix:e}=this;return d("div",{class:`${e}-log-loader`},d(se,{clsPrefix:e,strokeWidth:24,scale:.85}),d("span",{class:`${e}-log-loader__content`},this.locale.loading))}}),oe=ie("n-log"),Ne=H({props:{line:{type:String,default:""}},setup(e){const{trimRef:o,highlightRef:n,languageRef:t,mergedHljsRef:l}=Y(oe),r=N(null),p=C(()=>o.value?e.line.trim():e.line);function w(){r.value&&(r.value.innerHTML=S(t.value,p.value))}function S(v,y){const{value:F}=l;return F&&v&&F.getLanguage(v)?F.highlight(y,{language:v}).value:y}return q(()=>{n.value&&w()}),P(E(e,"line"),()=>{n.value&&w()}),{highlight:n,selfRef:r,maybeTrimmedLines:p}},render(){const{highlight:e,maybeTrimmedLines:o}=this;return d("pre",{ref:"selfRef"},e?null:o)}}),Ee=B("log",`
 position: relative;
 box-sizing: border-box;
 transition: border-color .3s var(--n-bezier);
`,[k("pre",`
 white-space: pre-wrap;
 word-break: break-word;
 margin: 0;
 `),B("log-loader",`
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 box-sizing: border-box;
 position: absolute;
 right: 16px;
 top: 8px;
 height: 34px;
 border-radius: 17px;
 line-height: 34px;
 white-space: nowrap;
 overflow: hidden;
 border: var(--n-loader-border);
 color: var(--n-loader-text-color);
 background-color: var(--n-loader-color);
 font-size: var(--n-loader-font-size);
 `,[xe(),Q("content",`
 display: inline-block;
 vertical-align: bottom;
 line-height: 34px;
 padding-left: 40px;
 padding-right: 20px;
 white-space: nowrap;
 `),B("base-loading",`
 color: var(--n-loading-color);
 position: absolute;
 left: 12px;
 top: calc(50% - 10px);
 font-size: 20px;
 width: 20px;
 height: 20px;
 display: inline-block;
 `)])]),He=Object.assign(Object.assign({},O.props),{loading:Boolean,trim:Boolean,log:String,fontSize:{type:Number,default:14},lines:{type:Array,default:()=>[]},lineHeight:{type:Number,default:1.25},language:String,rows:{type:Number,default:15},offsetTop:{type:Number,default:0},offsetBottom:{type:Number,default:0},hljs:Object,onReachTop:Function,onReachBottom:Function,onRequireMore:Function}),_e=H({name:"Log",props:He,setup(e){const{mergedClsPrefixRef:o,inlineThemeDisabled:n}=X(e),t=N(!1),l=C(()=>e.language!==void 0),r=C(()=>`calc(${Math.round(e.rows*e.lineHeight*e.fontSize)}px)`),p=C(()=>{const{log:i}=e;return i?i.split(`
`):e.lines}),w=N(null),S=O("Log","-log",Ee,Me,e,o);function v(i){const a=i.target,j=a.firstElementChild;if(t.value){V(()=>{t.value=!1});return}const R=a.offsetHeight,m=a.scrollTop,T=j.offsetHeight,z=m,M=T-m-R;if(z<=e.offsetTop){const{onReachTop:$,onRequireMore:g}=e;g&&g("top"),$&&$()}if(M<=e.offsetBottom){const{onReachBottom:$,onRequireMore:g}=e;g&&g("bottom"),$&&$()}}const y=je(F,300);function F(i){if(t.value){V(()=>{t.value=!1});return}if(w.value){const{containerRef:a,contentRef:j}=w.value;if(a&&j){const R=a.offsetHeight,m=a.scrollTop,T=j.offsetHeight,z=m,M=T-m-R,$=i.deltaY;if(z===0&&$<0){const{onRequireMore:g}=e;g&&g("top")}if(M<=0&&$>0){const{onRequireMore:g}=e;g&&g("bottom")}}}}function x(i){const{value:a}=w;if(!a)return;const{slient:j,top:R,position:m}=i;j&&(t.value=!0),R!==void 0?a.scrollTo({left:0,top:R}):(m==="bottom"||m==="top")&&a.scrollTo({position:m})}function s(i=!1){D("log","`scrollToTop` is deprecated, please use `scrollTo({ position: 'top'})` instead."),x({position:"top",slient:i})}function f(i=!1){D("log","`scrollToTop` is deprecated, please use `scrollTo({ position: 'bottom'})` instead."),x({position:"bottom",slient:i})}ae(oe,{languageRef:E(e,"language"),mergedHljsRef:J(e),trimRef:E(e,"trim"),highlightRef:l});const u={scrollTo:x},h=C(()=>{const{self:{loaderFontSize:i,loaderTextColor:a,loaderColor:j,loaderBorder:R,loadingColor:m},common:{cubicBezierEaseInOut:T}}=S.value;return{"--n-bezier":T,"--n-loader-font-size":i,"--n-loader-border":R,"--n-loader-color":j,"--n-loader-text-color":a,"--n-loading-color":m}}),c=n?Z("log",void 0,h,e):void 0;return Object.assign(Object.assign({},u),{mergedClsPrefix:o,scrollbarRef:w,mergedTheme:S,styleHeight:r,mergedLines:p,scrollToTop:s,scrollToBottom:f,handleWheel:y,handleScroll:v,cssVars:n?void 0:h,themeClass:c==null?void 0:c.themeClass,onRender:c==null?void 0:c.onRender})},render(){const{mergedClsPrefix:e,mergedTheme:o,onRender:n}=this;return n==null||n(),d("div",{class:[`${e}-log`,this.themeClass],style:[{lineHeight:this.lineHeight,height:this.styleHeight},this.cssVars],onWheelPassive:this.handleWheel},[d(Re,{ref:"scrollbarRef",theme:o.peers.Scrollbar,themeOverrides:o.peerOverrides.Scrollbar,onScroll:this.handleScroll},{default:()=>d(Fe,{internalNoHighlight:!0,internalFontSize:this.fontSize,theme:o.peers.Code,themeOverrides:o.peerOverrides.Code},{default:()=>this.mergedLines.map((t,l)=>d(Ne,{key:l,line:t}))})}),d(ce,{name:"fade-in-scale-up-transition"},{default:()=>this.loading?d(ke,{clsPrefix:e}):null})])}});function Ge(e){return ne({url:"/log/detail",method:"get",params:e})}const K=[["requestFullscreen","exitFullscreen","fullscreenElement","fullscreenEnabled","fullscreenchange","fullscreenerror"],["webkitRequestFullscreen","webkitExitFullscreen","webkitFullscreenElement","webkitFullscreenEnabled","webkitfullscreenchange","webkitfullscreenerror"],["webkitRequestFullScreen","webkitCancelFullScreen","webkitCurrentFullScreenElement","webkitCancelFullScreen","webkitfullscreenchange","webkitfullscreenerror"],["mozRequestFullScreen","mozCancelFullScreen","mozFullScreenElement","mozFullScreenEnabled","mozfullscreenchange","mozfullscreenerror"],["msRequestFullscreen","msExitFullscreen","msFullscreenElement","msFullscreenEnabled","MSFullscreenChange","MSFullscreenError"]],L=(()=>{if(typeof document>"u")return!1;const e=K[0],o={};for(const n of K)if((n==null?void 0:n[1])in document){for(const[l,r]of n.entries())o[e[l]]=r;return o}return!1})(),U={change:L.fullscreenchange,error:L.fullscreenerror};let b={request(e=document.documentElement,o){return new Promise((n,t)=>{const l=()=>{b.off("change",l),n()};b.on("change",l);const r=e[L.requestFullscreen](o);r instanceof Promise&&r.then(l).catch(t)})},exit(){return new Promise((e,o)=>{if(!b.isFullscreen){e();return}const n=()=>{b.off("change",n),e()};b.on("change",n);const t=document[L.exitFullscreen]();t instanceof Promise&&t.then(n).catch(o)})},toggle(e,o){return b.isFullscreen?b.exit():b.request(e,o)},onchange(e){b.on("change",e)},onerror(e){b.on("error",e)},on(e,o){const n=U[e];n&&document.addEventListener(n,o,!1)},off(e,o){const n=U[e];n&&document.removeEventListener(n,o,!1)},raw:L};Object.defineProperties(b,{isFullscreen:{get:()=>Boolean(document[L.fullscreenElement])},element:{enumerable:!0,get:()=>{var e;return(e=document[L.fullscreenElement])!=null?e:void 0}},isEnabled:{enumerable:!0,get:()=>Boolean(document[L.fullscreenEnabled])}});L||(b={isEnabled:!1});const _=b,Be={showModalRef:{type:Boolean,default:!1},logRef:{type:String,default:""},logLoadingRef:{type:Boolean,default:!1},row:{type:Object,default:{}},showDownloadLog:{type:Boolean,default:!1}},Qe=H({name:"log-modal",props:Be,emits:["confirmModal","refreshLogs","downloadLogs"],setup(e,o){const{t:n}=ue(),t=de({isFullscreen:!1}),l=()=>{t.isFullscreen=_.isFullscreen},r=y=>()=>d($e,null,{default:()=>d(y)}),p=()=>{t.isFullscreen=!1,o.emit("confirmModal",e.showModalRef)},w=()=>{o.emit("refreshLogs",e.row)},S=()=>{_.toggle(document.querySelectorAll(".logModalRef")[0])},v=()=>{o.emit("downloadLogs",e.row)};return q(()=>{_.on("change",l)}),fe(()=>{_.on("change",l)}),{t:n,renderIcon:r,confirmModal:p,refreshLogs:w,downloadLogs:v,handleFullScreen:S,...he(t)}},render(){const{t:e,renderIcon:o,refreshLogs:n,downloadLogs:t,isFullscreen:l,handleFullScreen:r,showDownloadLog:p}=this;return A(me,{class:"logModalRef",title:e("project.task.view_log"),show:this.showModalRef,cancelShow:!1,onConfirm:this.confirmModal,style:{width:"60%"},headerLinks:N([{text:e("project.workflow.download_log"),show:p,action:t,icon:o(ge)},{text:e("project.task.refresh"),show:!0,action:n,icon:o(be)},{text:e(l?"project.task.cancel_full_screen":"project.task.enter_full_screen"),show:!0,action:r,icon:o(l?ve:pe)}])},{default:()=>[A(_e,{rows:30,log:this.logRef,loading:this.logLoadingRef,style:{height:l?"calc(100vh - 140px)":"525px"}},null)]})}});export{Qe as L,Ge as q};

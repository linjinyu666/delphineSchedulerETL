import{i as rr}from"./Button.2b930b23.js";import{d as Z,h as a,V as tr,r as m,G as ce,S as nr,g as F,l as v,p as s,k as C,n as z,_ as H,b as ar,e as ze,$ as ir,X as lr,a0 as pe,o as sr,E as ur,a1 as ge,Q as cr,f as dr,t as fr,F as hr,a2 as be,a3 as me,a4 as vr,j as se}from"./index.291055ec.js";import{a as pr,r as q,b as ue}from"./resolve-slot.9ff69768.js";import{u as gr}from"./use-locale.70afb681.js";import{u as br}from"./use-merged-state.b2e27208.js";import{u as mr}from"./use-form-item.5072a1b6.js";import{N as xr,o as xe,a as we}from"./Scrollbar.c679a5ee.js";import{V as wr}from"./VResizeObserver.4329b960.js";import{N as ye,a as yr}from"./Suffix.08a7effb.js";import{c as w}from"./call.00499c7e.js";import{a as Cr}from"./index.62f1e1b0.js";const zr=Z({name:"Eye",render(){return a("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 512 512"},a("path",{d:"M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 0 0-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 0 0 0-17.47C428.89 172.28 347.8 112 255.66 112z",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"}),a("circle",{cx:"256",cy:"256",r:"80",fill:"none",stroke:"currentColor","stroke-miterlimit":"10","stroke-width":"32"}))}}),Sr=Z({name:"EyeOff",render(){return a("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 512 512"},a("path",{d:"M432 448a15.92 15.92 0 0 1-11.31-4.69l-352-352a16 16 0 0 1 22.62-22.62l352 352A16 16 0 0 1 432 448z",fill:"currentColor"}),a("path",{d:"M255.66 384c-41.49 0-81.5-12.28-118.92-36.5c-34.07-22-64.74-53.51-88.7-91v-.08c19.94-28.57 41.78-52.73 65.24-72.21a2 2 0 0 0 .14-2.94L93.5 161.38a2 2 0 0 0-2.71-.12c-24.92 21-48.05 46.76-69.08 76.92a31.92 31.92 0 0 0-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416a239.13 239.13 0 0 0 75.8-12.58a2 2 0 0 0 .77-3.31l-21.58-21.58a4 4 0 0 0-3.83-1a204.8 204.8 0 0 1-51.16 6.47z",fill:"currentColor"}),a("path",{d:"M490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96a227.34 227.34 0 0 0-74.89 12.83a2 2 0 0 0-.75 3.31l21.55 21.55a4 4 0 0 0 3.88 1a192.82 192.82 0 0 1 50.21-6.69c40.69 0 80.58 12.43 118.55 37c34.71 22.4 65.74 53.88 89.76 91a.13.13 0 0 1 0 .16a310.72 310.72 0 0 1-64.12 72.73a2 2 0 0 0-.15 2.95l19.9 19.89a2 2 0 0 0 2.7.13a343.49 343.49 0 0 0 68.64-78.48a32.2 32.2 0 0 0-.1-34.78z",fill:"currentColor"}),a("path",{d:"M256 160a95.88 95.88 0 0 0-21.37 2.4a2 2 0 0 0-1 3.38l112.59 112.56a2 2 0 0 0 3.38-1A96 96 0 0 0 256 160z",fill:"currentColor"}),a("path",{d:"M165.78 233.66a2 2 0 0 0-3.38 1a96 96 0 0 0 115 115a2 2 0 0 0 1-3.38z",fill:"currentColor"}))}}),Se=tr("n-input");function Ar(r){let p=0;for(const n of r)p++;return p}function J(r){return r===""||r==null}function _r(r){const p=m(null);function n(){const{value:h}=r;if(!(h!=null&&h.focus)){_();return}const{selectionStart:c,selectionEnd:i,value:l}=h;if(c==null||i==null){_();return}p.value={start:c,end:i,beforeText:l.slice(0,c),afterText:l.slice(i)}}function A(){var h;const{value:c}=p,{value:i}=r;if(!c||!i)return;const{value:l}=i,{start:d,beforeText:u,afterText:x}=c;let y=l.length;if(l.endsWith(x))y=l.length-x.length;else if(l.startsWith(u))y=u.length;else{const j=u[d-1],S=l.indexOf(j,d-1);S!==-1&&(y=S+1)}(h=i.setSelectionRange)===null||h===void 0||h.call(i,y,y)}function _(){p.value=null}return ce(r,_),{recordCursor:n,restoreCursor:A}}const Ce=Z({name:"InputWordCount",setup(r,{slots:p}){const{mergedValueRef:n,maxlengthRef:A,mergedClsPrefixRef:_}=nr(Se),h=F(()=>{const{value:c}=n;return c===null||Array.isArray(c)?0:Ar(c)});return()=>{const{value:c}=A,{value:i}=n;return a("span",{class:`${_.value}-input-word-count`},pr(p.default,{value:i===null||Array.isArray(i)?"":i},()=>[c===void 0?h.value:`${h.value} / ${c}`]))}}}),Rr=v("input",`
 max-width: 100%;
 cursor: text;
 line-height: 1.5;
 z-index: auto;
 outline: none;
 box-sizing: border-box;
 position: relative;
 display: inline-flex;
 border-radius: var(--n-border-radius);
 background-color: var(--n-color);
 transition: background-color .3s var(--n-bezier);
 font-size: var(--n-font-size);
 --n-padding-vertical: calc((var(--n-height) - 1.5 * var(--n-font-size)) / 2);
`,[s("input, textarea",`
 overflow: hidden;
 flex-grow: 1;
 position: relative;
 `),s("input-el, textarea-el, input-mirror, textarea-mirror, separator, placeholder",`
 box-sizing: border-box;
 font-size: inherit;
 line-height: 1.5;
 font-family: inherit;
 border: none;
 outline: none;
 background-color: #0000;
 text-align: inherit;
 transition:
 -webkit-text-fill-color .3s var(--n-bezier),
 caret-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 text-decoration-color .3s var(--n-bezier);
 `),s("input-el, textarea-el",`
 -webkit-appearance: none;
 scrollbar-width: none;
 width: 100%;
 min-width: 0;
 text-decoration-color: var(--n-text-decoration-color);
 color: var(--n-text-color);
 caret-color: var(--n-caret-color);
 background-color: transparent;
 `,[C("&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb",`
 width: 0;
 height: 0;
 display: none;
 `),C("&::placeholder",`
 color: #0000;
 -webkit-text-fill-color: transparent !important;
 `),C("&:-webkit-autofill ~",[s("placeholder","display: none;")])]),z("round",[H("textarea","border-radius: calc(var(--n-height) / 2);")]),s("placeholder",`
 pointer-events: none;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 overflow: hidden;
 color: var(--n-placeholder-color);
 `,[C("span",`
 width: 100%;
 display: inline-block;
 `)]),z("textarea",[s("placeholder","overflow: visible;")]),H("autosize","width: 100%;"),z("autosize",[s("textarea-el, input-el",`
 position: absolute;
 top: 0;
 left: 0;
 height: 100%;
 `)]),v("input-wrapper",`
 overflow: hidden;
 display: inline-flex;
 flex-grow: 1;
 position: relative;
 padding-left: var(--n-padding-left);
 padding-right: var(--n-padding-right);
 `),s("input-mirror",`
 padding: 0;
 height: var(--n-height);
 overflow: hidden;
 visibility: hidden;
 position: static;
 white-space: nowrap;
 pointer-events: none;
 `),s("input-el",`
 padding: 0;
 height: var(--n-height);
 line-height: var(--n-height);
 `,[C("+",[s("placeholder",`
 display: flex;
 align-items: center; 
 `)])]),H("textarea",[s("placeholder","white-space: nowrap;")]),s("eye",`
 transition: color .3s var(--n-bezier);
 `),z("textarea","width: 100%;",[v("input-word-count",`
 position: absolute;
 right: var(--n-padding-right);
 bottom: var(--n-padding-vertical);
 `),z("resizable",[v("input-wrapper",`
 resize: vertical;
 min-height: var(--n-height);
 `)]),s("textarea-el, textarea-mirror, placeholder",`
 height: 100%;
 padding-left: 0;
 padding-right: 0;
 padding-top: var(--n-padding-vertical);
 padding-bottom: var(--n-padding-vertical);
 word-break: break-word;
 display: inline-block;
 vertical-align: bottom;
 box-sizing: border-box;
 line-height: var(--n-line-height-textarea);
 margin: 0;
 resize: none;
 white-space: pre-wrap;
 `),s("textarea-mirror",`
 width: 100%;
 pointer-events: none;
 overflow: hidden;
 visibility: hidden;
 position: static;
 white-space: pre-wrap;
 overflow-wrap: break-word;
 `)]),z("pair",[s("input-el, placeholder","text-align: center;"),s("separator",`
 display: flex;
 align-items: center;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 white-space: nowrap;
 `,[v("icon",`
 color: var(--n-icon-color);
 `),v("base-icon",`
 color: var(--n-icon-color);
 `)])]),z("disabled",`
 cursor: not-allowed;
 background-color: var(--n-color-disabled);
 `,[s("border","border: var(--n-border-disabled);"),s("input-el, textarea-el",`
 cursor: not-allowed;
 color: var(--n-text-color-disabled);
 text-decoration-color: var(--n-text-color-disabled);
 `),s("placeholder","color: var(--n-placeholder-color-disabled);"),s("separator","color: var(--n-text-color-disabled);",[v("icon",`
 color: var(--n-icon-color-disabled);
 `),v("base-icon",`
 color: var(--n-icon-color-disabled);
 `)]),v("input-word-count",`
 color: var(--n-count-text-color-disabled);
 `),s("suffix, prefix","color: var(--n-text-color-disabled);",[v("icon",`
 color: var(--n-icon-color-disabled);
 `),v("internal-icon",`
 color: var(--n-icon-color-disabled);
 `)])]),H("disabled",[s("eye",`
 display: flex;
 align-items: center;
 justify-content: center;
 color: var(--n-icon-color);
 cursor: pointer;
 `,[C("&:hover",`
 color: var(--n-icon-color-hover);
 `),C("&:active",`
 color: var(--n-icon-color-pressed);
 `)]),C("&:hover",[s("state-border","border: var(--n-border-hover);")]),z("focus","background-color: var(--n-color-focus);",[s("state-border",`
 border: var(--n-border-focus);
 box-shadow: var(--n-box-shadow-focus);
 `)])]),s("border, state-border",`
 box-sizing: border-box;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 pointer-events: none;
 border-radius: inherit;
 border: var(--n-border);
 transition:
 box-shadow .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `),s("state-border",`
 border-color: #0000;
 z-index: 1;
 `),s("prefix","margin-right: 4px;"),s("suffix",`
 margin-left: 4px;
 `),s("suffix, prefix",`
 transition: color .3s var(--n-bezier);
 flex-wrap: nowrap;
 flex-shrink: 0;
 line-height: var(--n-height);
 white-space: nowrap;
 display: inline-flex;
 align-items: center;
 justify-content: center;
 color: var(--n-suffix-text-color);
 `,[v("base-loading",`
 font-size: var(--n-icon-size);
 margin: 0 2px;
 color: var(--n-loading-color);
 `),v("base-clear",`
 font-size: var(--n-icon-size);
 `,[s("placeholder",[v("base-icon",`
 transition: color .3s var(--n-bezier);
 color: var(--n-icon-color);
 font-size: var(--n-icon-size);
 `)])]),C(">",[v("icon",`
 transition: color .3s var(--n-bezier);
 color: var(--n-icon-color);
 font-size: var(--n-icon-size);
 `)]),v("base-icon",`
 font-size: var(--n-icon-size);
 `)]),v("input-word-count",`
 pointer-events: none;
 line-height: 1.5;
 font-size: .85em;
 color: var(--n-count-text-color);
 transition: color .3s var(--n-bezier);
 margin-left: 4px;
 font-variant: tabular-nums;
 `),["warning","error"].map(r=>z(`${r}-status`,[H("disabled",[v("base-loading",`
 color: var(--n-loading-color-${r})
 `),s("input-el, textarea-el",`
 caret-color: var(--n-caret-color-${r});
 `),s("state-border",`
 border: var(--n-border-${r});
 `),C("&:hover",[s("state-border",`
 border: var(--n-border-hover-${r});
 `)]),C("&:focus",`
 background-color: var(--n-color-focus-${r});
 `,[s("state-border",`
 box-shadow: var(--n-box-shadow-focus-${r});
 border: var(--n-border-focus-${r});
 `)]),z("focus",`
 background-color: var(--n-color-focus-${r});
 `,[s("state-border",`
 box-shadow: var(--n-box-shadow-focus-${r});
 border: var(--n-border-focus-${r});
 `)])])]))]),Fr=v("input",[z("disabled",[s("input-el, textarea-el",`
 -webkit-text-fill-color: var(--n-text-color-disabled);
 `)])]),Br=Object.assign(Object.assign({},ze.props),{bordered:{type:Boolean,default:void 0},type:{type:String,default:"text"},placeholder:[Array,String],defaultValue:{type:[String,Array],default:null},value:[String,Array],disabled:{type:Boolean,default:void 0},size:String,rows:{type:[Number,String],default:3},round:Boolean,minlength:[String,Number],maxlength:[String,Number],clearable:Boolean,autosize:{type:[Boolean,Object],default:!1},pair:Boolean,separator:String,readonly:{type:[String,Boolean],default:!1},passivelyActivated:Boolean,showPasswordOn:String,stateful:{type:Boolean,default:!0},autofocus:Boolean,inputProps:Object,resizable:{type:Boolean,default:!0},showCount:Boolean,loading:{type:Boolean,default:void 0},allowInput:Function,renderCount:Function,onMousedown:Function,onKeydown:Function,onKeyup:Function,onInput:[Function,Array],onFocus:[Function,Array],onBlur:[Function,Array],onClick:[Function,Array],onChange:[Function,Array],onClear:[Function,Array],status:String,"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],textDecoration:[String,Array],attrSize:{type:Number,default:20},onInputBlur:[Function,Array],onInputFocus:[Function,Array],onDeactivate:[Function,Array],onActivate:[Function,Array],onWrapperFocus:[Function,Array],onWrapperBlur:[Function,Array],internalDeactivateOnEnter:Boolean,internalForceFocus:Boolean,internalLoadingBeforeSuffix:Boolean,showPasswordToggle:Boolean}),Nr=Z({name:"Input",props:Br,setup(r){const{mergedClsPrefixRef:p,mergedBorderedRef:n,inlineThemeDisabled:A,mergedRtlRef:_}=ar(r),h=ze("Input","-input",Rr,vr,r,p);rr&&ir("-input-safari",Fr,p);const c=m(null),i=m(null),l=m(null),d=m(null),u=m(null),x=m(null),y=m(null),j=_r(y),S=m(null),{localeRef:Ae}=gr("Input"),U=m(r.defaultValue),_e=lr(r,"value"),R=br(_e,U),M=mr(r),{mergedSizeRef:ee,mergedDisabledRef:T,mergedStatusRef:Re}=M,I=m(!1),V=m(!1),B=m(!1),W=m(!1);let oe=null;const re=F(()=>{const{placeholder:e,pair:o}=r;return o?Array.isArray(e)?e:e===void 0?["",""]:[e,e]:e===void 0?[Ae.value.placeholder]:[e]}),Fe=F(()=>{const{value:e}=B,{value:o}=R,{value:t}=re;return!e&&(J(o)||Array.isArray(o)&&J(o[0]))&&t[0]}),Be=F(()=>{const{value:e}=B,{value:o}=R,{value:t}=re;return!e&&t[1]&&(J(o)||Array.isArray(o)&&J(o[1]))}),te=pe(()=>r.internalForceFocus||I.value),Ee=pe(()=>{if(T.value||r.readonly||!r.clearable||!te.value&&!V.value)return!1;const{value:e}=R,{value:o}=te;return r.pair?!!(Array.isArray(e)&&(e[0]||e[1]))&&(V.value||o):!!e&&(V.value||o)}),ne=F(()=>{const{showPasswordOn:e}=r;if(e)return e;if(r.showPasswordToggle)return"click"}),D=m(!1),$e=F(()=>{const{textDecoration:e}=r;return e?Array.isArray(e)?e.map(o=>({textDecoration:o})):[{textDecoration:e}]:["",""]}),de=m(void 0),Pe=()=>{var e,o;if(r.type==="textarea"){const{autosize:t}=r;if(t&&(de.value=(o=(e=S.value)===null||e===void 0?void 0:e.$el)===null||o===void 0?void 0:o.offsetWidth),!i.value||typeof t=="boolean")return;const{paddingTop:f,paddingBottom:g,lineHeight:b}=window.getComputedStyle(i.value),E=Number(f.slice(0,-2)),$=Number(g.slice(0,-2)),P=Number(b.slice(0,-2)),{value:O}=l;if(!O)return;if(t.minRows){const N=Math.max(t.minRows,1),le=`${E+$+P*N}px`;O.style.minHeight=le}if(t.maxRows){const N=`${E+$+P*t.maxRows}px`;O.style.maxHeight=N}}},Te=F(()=>{const{maxlength:e}=r;return e===void 0?void 0:Number(e)});sr(()=>{const{value:e}=R;Array.isArray(e)||ie(e)});const Ie=ur().proxy;function K(e){const{onUpdateValue:o,"onUpdate:value":t,onInput:f}=r,{nTriggerFormInput:g}=M;o&&w(o,e),t&&w(t,e),f&&w(f,e),U.value=e,g()}function L(e){const{onChange:o}=r,{nTriggerFormChange:t}=M;o&&w(o,e),U.value=e,t()}function ke(e){const{onBlur:o}=r,{nTriggerFormBlur:t}=M;o&&w(o,e),t()}function Me(e){const{onFocus:o}=r,{nTriggerFormFocus:t}=M;o&&w(o,e),t()}function Ve(e){const{onClear:o}=r;o&&w(o,e)}function We(e){const{onInputBlur:o}=r;o&&w(o,e)}function De(e){const{onInputFocus:o}=r;o&&w(o,e)}function Oe(){const{onDeactivate:e}=r;e&&w(e)}function Ne(){const{onActivate:e}=r;e&&w(e)}function He(e){const{onClick:o}=r;o&&w(o,e)}function je(e){const{onWrapperFocus:o}=r;o&&w(o,e)}function Ue(e){const{onWrapperBlur:o}=r;o&&w(o,e)}function Ke(){B.value=!0}function Le(e){B.value=!1,e.target===x.value?X(e,1):X(e,0)}function X(e,o=0,t="input"){const f=e.target.value;if(ie(f),e instanceof InputEvent&&!e.isComposing&&(B.value=!1),r.type==="textarea"){const{value:b}=S;b&&b.syncUnifiedContainer()}if(oe=f,B.value)return;j.recordCursor();const g=Xe(f);if(g)if(!r.pair)t==="input"?K(f):L(f);else{let{value:b}=R;Array.isArray(b)?b=[b[0],b[1]]:b=["",""],b[o]=f,t==="input"?K(b):L(b)}Ie.$forceUpdate(),g||be(j.restoreCursor)}function Xe(e){const{allowInput:o}=r;return typeof o=="function"?o(e):!0}function Ye(e){We(e),e.relatedTarget===c.value&&Oe(),e.relatedTarget!==null&&(e.relatedTarget===u.value||e.relatedTarget===x.value||e.relatedTarget===i.value)||(W.value=!1),Y(e,"blur"),y.value=null}function Ge(e,o){De(e),I.value=!0,W.value=!0,Ne(),Y(e,"focus"),o===0?y.value=u.value:o===1?y.value=x.value:o===2&&(y.value=i.value)}function Qe(e){r.passivelyActivated&&(Ue(e),Y(e,"blur"))}function qe(e){r.passivelyActivated&&(I.value=!0,je(e),Y(e,"focus"))}function Y(e,o){e.relatedTarget!==null&&(e.relatedTarget===u.value||e.relatedTarget===x.value||e.relatedTarget===i.value||e.relatedTarget===c.value)||(o==="focus"?(Me(e),I.value=!0):o==="blur"&&(ke(e),I.value=!1))}function Je(e,o){X(e,o,"change")}function Ze(e){He(e)}function eo(e){Ve(e),r.pair?(K(["",""]),L(["",""])):(K(""),L(""))}function oo(e){const{onMousedown:o}=r;o&&o(e);const{tagName:t}=e.target;if(t!=="INPUT"&&t!=="TEXTAREA"){if(r.resizable){const{value:f}=c;if(f){const{left:g,top:b,width:E,height:$}=f.getBoundingClientRect(),P=14;if(g+E-P<e.clientX&&e.clientX<g+E&&b+$-P<e.clientY&&e.clientY<b+$)return}}e.preventDefault(),I.value||fe()}}function ro(){var e;V.value=!0,r.type==="textarea"&&((e=S.value)===null||e===void 0||e.handleMouseEnterWrapper())}function to(){var e;V.value=!1,r.type==="textarea"&&((e=S.value)===null||e===void 0||e.handleMouseLeaveWrapper())}function no(){T.value||ne.value==="click"&&(D.value=!D.value)}function ao(e){if(T.value)return;e.preventDefault();const o=f=>{f.preventDefault(),we("mouseup",document,o)};if(xe("mouseup",document,o),ne.value!=="mousedown")return;D.value=!0;const t=()=>{D.value=!1,we("mouseup",document,t)};xe("mouseup",document,t)}function io(e){var o;switch((o=r.onKeydown)===null||o===void 0||o.call(r,e),e.key){case"Escape":ae();break;case"Enter":lo(e);break}}function lo(e){var o,t;if(r.passivelyActivated){const{value:f}=W;if(f){r.internalDeactivateOnEnter&&ae();return}e.preventDefault(),r.type==="textarea"?(o=i.value)===null||o===void 0||o.focus():(t=u.value)===null||t===void 0||t.focus()}}function ae(){r.passivelyActivated&&(W.value=!1,be(()=>{var e;(e=c.value)===null||e===void 0||e.focus()}))}function fe(){var e,o,t;T.value||(r.passivelyActivated?(e=c.value)===null||e===void 0||e.focus():((o=i.value)===null||o===void 0||o.focus(),(t=u.value)===null||t===void 0||t.focus()))}function so(){var e;!((e=c.value)===null||e===void 0)&&e.contains(document.activeElement)&&document.activeElement.blur()}function uo(){var e,o;(e=i.value)===null||e===void 0||e.select(),(o=u.value)===null||o===void 0||o.select()}function co(){T.value||(i.value?i.value.focus():u.value&&u.value.focus())}function fo(){const{value:e}=c;(e==null?void 0:e.contains(document.activeElement))&&e!==document.activeElement&&ae()}function ho(e){if(r.type==="textarea"){const{value:o}=i;o==null||o.scrollTo(e)}else{const{value:o}=u;o==null||o.scrollTo(e)}}function ie(e){const{type:o,pair:t,autosize:f}=r;if(!t&&f)if(o==="textarea"){const{value:g}=l;g&&(g.textContent=(e!=null?e:"")+`\r
`)}else{const{value:g}=d;g&&(e?g.textContent=e:g.innerHTML="&nbsp;")}}function vo(){Pe()}const he=m({top:"0"});function po(e){var o;const{scrollTop:t}=e.target;he.value.top=`${-t}px`,(o=S.value)===null||o===void 0||o.syncUnifiedContainer()}let G=null;ge(()=>{const{autosize:e,type:o}=r;e&&o==="textarea"?G=ce(R,t=>{!Array.isArray(t)&&t!==oe&&ie(t)}):G==null||G()});let Q=null;ge(()=>{r.type==="textarea"?Q=ce(R,e=>{var o;!Array.isArray(e)&&e!==oe&&((o=S.value)===null||o===void 0||o.syncUnifiedContainer())}):Q==null||Q()}),cr(Se,{mergedValueRef:R,maxlengthRef:Te,mergedClsPrefixRef:p});const go={wrapperElRef:c,inputElRef:u,textareaElRef:i,isCompositing:B,focus:fe,blur:so,select:uo,deactivate:fo,activate:co,scrollTo:ho},bo=dr("Input",_,p),ve=F(()=>{const{value:e}=ee,{common:{cubicBezierEaseInOut:o},self:{color:t,borderRadius:f,textColor:g,caretColor:b,caretColorError:E,caretColorWarning:$,textDecorationColor:P,border:O,borderDisabled:N,borderHover:le,borderFocus:mo,placeholderColor:xo,placeholderColorDisabled:wo,lineHeightTextarea:yo,colorDisabled:Co,colorFocus:zo,textColorDisabled:So,boxShadowFocus:Ao,iconSize:_o,colorFocusWarning:Ro,boxShadowFocusWarning:Fo,borderWarning:Bo,borderFocusWarning:Eo,borderHoverWarning:$o,colorFocusError:Po,boxShadowFocusError:To,borderError:Io,borderFocusError:ko,borderHoverError:Mo,clearSize:Vo,clearColor:Wo,clearColorHover:Do,clearColorPressed:Oo,iconColor:No,iconColorDisabled:Ho,suffixTextColor:jo,countTextColor:Uo,countTextColorDisabled:Ko,iconColorHover:Lo,iconColorPressed:Xo,loadingColor:Yo,loadingColorError:Go,loadingColorWarning:Qo,[se("padding",e)]:qo,[se("fontSize",e)]:Jo,[se("height",e)]:Zo}}=h.value,{left:er,right:or}=Cr(qo);return{"--n-bezier":o,"--n-count-text-color":Uo,"--n-count-text-color-disabled":Ko,"--n-color":t,"--n-font-size":Jo,"--n-border-radius":f,"--n-height":Zo,"--n-padding-left":er,"--n-padding-right":or,"--n-text-color":g,"--n-caret-color":b,"--n-text-decoration-color":P,"--n-border":O,"--n-border-disabled":N,"--n-border-hover":le,"--n-border-focus":mo,"--n-placeholder-color":xo,"--n-placeholder-color-disabled":wo,"--n-icon-size":_o,"--n-line-height-textarea":yo,"--n-color-disabled":Co,"--n-color-focus":zo,"--n-text-color-disabled":So,"--n-box-shadow-focus":Ao,"--n-loading-color":Yo,"--n-caret-color-warning":$,"--n-color-focus-warning":Ro,"--n-box-shadow-focus-warning":Fo,"--n-border-warning":Bo,"--n-border-focus-warning":Eo,"--n-border-hover-warning":$o,"--n-loading-color-warning":Qo,"--n-caret-color-error":E,"--n-color-focus-error":Po,"--n-box-shadow-focus-error":To,"--n-border-error":Io,"--n-border-focus-error":ko,"--n-border-hover-error":Mo,"--n-loading-color-error":Go,"--n-clear-color":Wo,"--n-clear-size":Vo,"--n-clear-color-hover":Do,"--n-clear-color-pressed":Oo,"--n-icon-color":No,"--n-icon-color-hover":Lo,"--n-icon-color-pressed":Xo,"--n-icon-color-disabled":Ho,"--n-suffix-text-color":jo}}),k=A?fr("input",F(()=>{const{value:e}=ee;return e[0]}),ve,r):void 0;return Object.assign(Object.assign({},go),{wrapperElRef:c,inputElRef:u,inputMirrorElRef:d,inputEl2Ref:x,textareaElRef:i,textareaMirrorElRef:l,textareaScrollbarInstRef:S,rtlEnabled:bo,uncontrolledValue:U,mergedValue:R,passwordVisible:D,mergedPlaceholder:re,showPlaceholder1:Fe,showPlaceholder2:Be,mergedFocus:te,isComposing:B,activated:W,showClearButton:Ee,mergedSize:ee,mergedDisabled:T,textDecorationStyle:$e,mergedClsPrefix:p,mergedBordered:n,mergedShowPasswordOn:ne,placeholderStyle:he,mergedStatus:Re,textAreaScrollContainerWidth:de,handleTextAreaScroll:po,handleCompositionStart:Ke,handleCompositionEnd:Le,handleInput:X,handleInputBlur:Ye,handleInputFocus:Ge,handleWrapperBlur:Qe,handleWrapperFocus:qe,handleMouseEnter:ro,handleMouseLeave:to,handleMouseDown:oo,handleChange:Je,handleClick:Ze,handleClear:eo,handlePasswordToggleClick:no,handlePasswordToggleMousedown:ao,handleWrapperKeydown:io,handleTextAreaMirrorResize:vo,getTextareaScrollContainer:()=>i.value,mergedTheme:h,cssVars:A?void 0:ve,themeClass:k==null?void 0:k.themeClass,onRender:k==null?void 0:k.onRender})},render(){var r,p;const{mergedClsPrefix:n,mergedStatus:A,themeClass:_,type:h,onRender:c}=this,i=this.$slots;return c==null||c(),a("div",{ref:"wrapperElRef",class:[`${n}-input`,_,A&&`${n}-input--${A}-status`,{[`${n}-input--rtl`]:this.rtlEnabled,[`${n}-input--disabled`]:this.mergedDisabled,[`${n}-input--textarea`]:h==="textarea",[`${n}-input--resizable`]:this.resizable&&!this.autosize,[`${n}-input--autosize`]:this.autosize,[`${n}-input--round`]:this.round&&h!=="textarea",[`${n}-input--pair`]:this.pair,[`${n}-input--focus`]:this.mergedFocus,[`${n}-input--stateful`]:this.stateful}],style:this.cssVars,tabindex:!this.mergedDisabled&&this.passivelyActivated&&!this.activated?0:void 0,onFocus:this.handleWrapperFocus,onBlur:this.handleWrapperBlur,onClick:this.handleClick,onMousedown:this.handleMouseDown,onMouseenter:this.handleMouseEnter,onMouseleave:this.handleMouseLeave,onCompositionstart:this.handleCompositionStart,onCompositionend:this.handleCompositionEnd,onKeyup:this.onKeyup,onKeydown:this.handleWrapperKeydown},a("div",{class:`${n}-input-wrapper`},q(i.prefix,l=>l&&a("div",{class:`${n}-input__prefix`},l)),h==="textarea"?a(xr,{ref:"textareaScrollbarInstRef",class:`${n}-input__textarea`,container:this.getTextareaScrollContainer,triggerDisplayManually:!0,useUnifiedContainer:!0,internalHoistYRail:!0},{default:()=>{var l,d;const{textAreaScrollContainerWidth:u}=this,x={width:this.autosize&&u&&`${u}px`};return a(hr,null,a("textarea",Object.assign({},this.inputProps,{ref:"textareaElRef",class:[`${n}-input__textarea-el`,(l=this.inputProps)===null||l===void 0?void 0:l.class],autofocus:this.autofocus,rows:Number(this.rows),placeholder:this.placeholder,value:this.mergedValue,disabled:this.mergedDisabled,maxlength:this.maxlength,minlength:this.minlength,readonly:this.readonly,tabindex:this.passivelyActivated&&!this.activated?-1:void 0,style:[this.textDecorationStyle[0],(d=this.inputProps)===null||d===void 0?void 0:d.style,x],onBlur:this.handleInputBlur,onFocus:y=>this.handleInputFocus(y,2),onInput:this.handleInput,onChange:this.handleChange,onScroll:this.handleTextAreaScroll})),this.showPlaceholder1?a("div",{class:`${n}-input__placeholder`,style:[this.placeholderStyle,x],key:"placeholder"},this.mergedPlaceholder[0]):null,this.autosize?a(wr,{onResize:this.handleTextAreaMirrorResize},{default:()=>a("div",{ref:"textareaMirrorElRef",class:`${n}-input__textarea-mirror`,key:"mirror"})}):null)}}):a("div",{class:`${n}-input__input`},a("input",Object.assign({type:h==="password"&&this.mergedShowPasswordOn&&this.passwordVisible?"text":h},this.inputProps,{ref:"inputElRef",class:[`${n}-input__input-el`,(r=this.inputProps)===null||r===void 0?void 0:r.class],style:[this.textDecorationStyle[0],(p=this.inputProps)===null||p===void 0?void 0:p.style],tabindex:this.passivelyActivated&&!this.activated?-1:void 0,placeholder:this.mergedPlaceholder[0],disabled:this.mergedDisabled,maxlength:this.maxlength,minlength:this.minlength,value:Array.isArray(this.mergedValue)?this.mergedValue[0]:this.mergedValue,readonly:this.readonly,autofocus:this.autofocus,size:this.attrSize,onBlur:this.handleInputBlur,onFocus:l=>this.handleInputFocus(l,0),onInput:l=>this.handleInput(l,0),onChange:l=>this.handleChange(l,0)})),this.showPlaceholder1?a("div",{class:`${n}-input__placeholder`},a("span",null,this.mergedPlaceholder[0])):null,this.autosize?a("div",{class:`${n}-input__input-mirror`,key:"mirror",ref:"inputMirrorElRef"},"\xA0"):null),!this.pair&&q(i.suffix,l=>l||this.clearable||this.showCount||this.mergedShowPasswordOn||this.loading!==void 0?a("div",{class:`${n}-input__suffix`},[q(i["clear-icon-placeholder"],d=>(this.clearable||d)&&a(ye,{clsPrefix:n,show:this.showClearButton,onClear:this.handleClear},{placeholder:()=>d,icon:()=>{var u,x;return(x=(u=this.$slots)["clear-icon"])===null||x===void 0?void 0:x.call(u)}})),this.internalLoadingBeforeSuffix?null:l,this.loading!==void 0?a(yr,{clsPrefix:n,loading:this.loading,showArrow:!1,showClear:!1,style:this.cssVars}):null,this.internalLoadingBeforeSuffix?l:null,this.showCount&&this.type!=="textarea"?a(Ce,null,{default:d=>{var u;return(u=i.count)===null||u===void 0?void 0:u.call(i,d)}}):null,this.mergedShowPasswordOn&&this.type==="password"?a("div",{class:`${n}-input__eye`,onMousedown:this.handlePasswordToggleMousedown,onClick:this.handlePasswordToggleClick},this.passwordVisible?ue(i["password-visible-icon"],()=>[a(me,{clsPrefix:n},{default:()=>a(zr,null)})]):ue(i["password-invisible-icon"],()=>[a(me,{clsPrefix:n},{default:()=>a(Sr,null)})])):null]):null)),this.pair?a("span",{class:`${n}-input__separator`},ue(i.separator,()=>[this.separator])):null,this.pair?a("div",{class:`${n}-input-wrapper`},a("div",{class:`${n}-input__input`},a("input",{ref:"inputEl2Ref",type:this.type,class:`${n}-input__input-el`,tabindex:this.passivelyActivated&&!this.activated?-1:void 0,placeholder:this.mergedPlaceholder[1],disabled:this.mergedDisabled,maxlength:this.maxlength,minlength:this.minlength,value:Array.isArray(this.mergedValue)?this.mergedValue[1]:void 0,readonly:this.readonly,style:this.textDecorationStyle[1],onBlur:this.handleInputBlur,onFocus:l=>this.handleInputFocus(l,1),onInput:l=>this.handleInput(l,1),onChange:l=>this.handleChange(l,1)}),this.showPlaceholder2?a("div",{class:`${n}-input__placeholder`},a("span",null,this.mergedPlaceholder[1])):null),q(i.suffix,l=>(this.clearable||l)&&a("div",{class:`${n}-input__suffix`},[this.clearable&&a(ye,{clsPrefix:n,show:this.showClearButton,onClear:this.handleClear},{icon:()=>{var d;return(d=i["clear-icon"])===null||d===void 0?void 0:d.call(i)},placeholder:()=>{var d;return(d=i["clear-icon-placeholder"])===null||d===void 0?void 0:d.call(i)}}),l]))):null,this.mergedBordered?a("div",{class:`${n}-input__border`}):null,this.mergedBordered?a("div",{class:`${n}-input__state-border`}):null,this.showCount&&h==="textarea"?a(Ce,null,{default:l=>{var d;const{renderCount:u}=this;return u?u(l):(d=i.count)===null||d===void 0?void 0:d.call(i,l)}}):null)}});export{zr as E,Nr as N};

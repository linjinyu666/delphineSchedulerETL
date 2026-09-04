import{l as c,n as t,p as o,k as n,_ as I,d as N,e as h,g as u,b as O,f as F,t as H,h as l,ah as T,j as v}from"./index.291055ec.js";import{r as V,s as L}from"./RadioGroup.622b1e47.js";import{r as M}from"./resolve-slot.9ff69768.js";const K=c("radio",`
 line-height: var(--n-label-line-height);
 outline: none;
 position: relative;
 user-select: none;
 -webkit-user-select: none;
 display: inline-flex;
 align-items: flex-start;
 flex-wrap: nowrap;
 font-size: var(--n-font-size);
 word-break: break-word;
`,[t("checked",[o("dot",`
 background-color: var(--n-color-active);
 `)]),o("dot-wrapper",`
 position: relative;
 flex-shrink: 0;
 flex-grow: 0;
 width: var(--n-radio-size);
 `),c("radio-input",`
 position: absolute;
 border: 0;
 border-radius: inherit;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 opacity: 0;
 z-index: 1;
 cursor: pointer;
 `),o("dot",`
 position: absolute;
 top: 50%;
 left: 0;
 transform: translateY(-50%);
 height: var(--n-radio-size);
 width: var(--n-radio-size);
 background: var(--n-color);
 box-shadow: var(--n-box-shadow);
 border-radius: 50%;
 transition:
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 `,[n("&::before",`
 content: "";
 opacity: 0;
 position: absolute;
 left: 4px;
 top: 4px;
 height: calc(100% - 8px);
 width: calc(100% - 8px);
 border-radius: 50%;
 transform: scale(.8);
 background: var(--n-dot-color-active);
 transition: 
 opacity .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 transform .3s var(--n-bezier);
 `),t("checked",{boxShadow:"var(--n-box-shadow-active)"},[n("&::before",`
 opacity: 1;
 transform: scale(1);
 `)])]),o("label",`
 color: var(--n-text-color);
 padding: var(--n-label-padding);
 display: inline-block;
 transition: color .3s var(--n-bezier);
 `),I("disabled",`
 cursor: pointer;
 `,[n("&:hover",[o("dot",{boxShadow:"var(--n-box-shadow-hover)"})]),t("focus",[n("&:not(:active)",[o("dot",{boxShadow:"var(--n-box-shadow-focus)"})])])]),t("disabled",`
 cursor: not-allowed;
 `,[o("dot",{boxShadow:"var(--n-box-shadow-disabled)",backgroundColor:"var(--n-color-disabled)"},[n("&::before",{backgroundColor:"var(--n-dot-color-disabled)"}),t("checked",`
 opacity: 1;
 `)]),o("label",{color:"var(--n-text-color-disabled)"}),c("radio-input",`
 cursor: not-allowed;
 `)])]),G=N({name:"Radio",props:Object.assign(Object.assign({},h.props),V),setup(a){const e=L(a),i=h("Radio","-radio",K,T,a,e.mergedClsPrefix),s=u(()=>{const{mergedSize:{value:b}}=e,{common:{cubicBezierEaseInOut:g},self:{boxShadow:m,boxShadowActive:w,boxShadowDisabled:z,boxShadowFocus:k,boxShadowHover:C,color:R,colorDisabled:S,colorActive:y,textColor:$,textColorDisabled:_,dotColorActive:D,dotColorDisabled:E,labelPadding:P,labelLineHeight:j,[v("fontSize",b)]:A,[v("radioSize",b)]:B}}=i.value;return{"--n-bezier":g,"--n-label-line-height":j,"--n-box-shadow":m,"--n-box-shadow-active":w,"--n-box-shadow-disabled":z,"--n-box-shadow-focus":k,"--n-box-shadow-hover":C,"--n-color":R,"--n-color-active":y,"--n-color-disabled":S,"--n-dot-color-active":D,"--n-dot-color-disabled":E,"--n-font-size":A,"--n-radio-size":B,"--n-text-color":$,"--n-text-color-disabled":_,"--n-label-padding":P}}),{inlineThemeDisabled:d,mergedClsPrefixRef:f,mergedRtlRef:p}=O(a),x=F("Radio",p,f),r=d?H("radio",u(()=>e.mergedSize.value[0]),s,a):void 0;return Object.assign(e,{rtlEnabled:x,cssVars:d?void 0:s,themeClass:r==null?void 0:r.themeClass,onRender:r==null?void 0:r.onRender})},render(){const{$slots:a,mergedClsPrefix:e,onRender:i,label:s}=this;return i==null||i(),l("label",{class:[`${e}-radio`,this.themeClass,{[`${e}-radio--rtl`]:this.rtlEnabled,[`${e}-radio--disabled`]:this.mergedDisabled,[`${e}-radio--checked`]:this.renderSafeChecked,[`${e}-radio--focus`]:this.focus}],style:this.cssVars},l("input",{ref:"inputRef",type:"radio",class:`${e}-radio-input`,value:this.value,name:this.mergedName,checked:this.renderSafeChecked,disabled:this.mergedDisabled,onChange:this.handleRadioInputChange,onFocus:this.handleRadioInputFocus,onBlur:this.handleRadioInputBlur}),l("div",{class:`${e}-radio__dot-wrapper`},"\xA0",l("div",{class:[`${e}-radio__dot`,this.renderSafeChecked&&`${e}-radio__dot--checked`]})),M(a.default,d=>!d&&!s?null:l("div",{ref:"labelRef",class:`${e}-radio__label`},d||s)))}});export{G as N};

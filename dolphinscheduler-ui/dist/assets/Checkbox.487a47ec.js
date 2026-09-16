import{h as t,d as j,b as K,r as P,g as I,Q as te,X as N,V as se,k as b,l as n,p as y,n as A,aj as ue,q as be,s as he,S as fe,a0 as ke,e as E,f as ve,t as me,Y as xe,al as ge,bn as pe,j as _}from"./index.e2a499a0.js";import{u as H}from"./use-form-item.f54209ce.js";import{u as V}from"./use-merged-state.5f5f01e5.js";import{c as l}from"./resolve-slot.8e13efbe.js";import{o as Ce}from"./Scrollbar.632c53f6.js";const ye=t("svg",{viewBox:"0 0 64 64",class:"check-icon"},t("path",{d:"M50.42,16.76L22.34,39.45l-8.1-11.46c-1.12-1.58-3.3-1.96-4.88-0.84c-1.58,1.12-1.95,3.3-0.84,4.88l10.26,14.51  c0.56,0.79,1.42,1.31,2.38,1.45c0.16,0.02,0.32,0.03,0.48,0.03c0.8,0,1.57-0.27,2.2-0.78l30.99-25.03c1.5-1.21,1.74-3.42,0.52-4.92  C54.13,15.78,51.93,15.55,50.42,16.76z"})),Re=t("svg",{viewBox:"0 0 100 100",class:"line-icon"},t("path",{d:"M80.2,55.5H21.4c-2.8,0-5.1-2.5-5.1-5.5l0,0c0-3,2.3-5.5,5.1-5.5h58.7c2.8,0,5.1,2.5,5.1,5.5l0,0C85.2,53.1,82.9,55.5,80.2,55.5z"})),G=se("n-checkbox-group"),we={min:Number,max:Number,size:String,value:Array,defaultValue:{type:Array,default:null},disabled:{type:Boolean,default:void 0},"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],onChange:[Function,Array]},Be=j({name:"CheckboxGroup",props:we,setup(o){const{mergedClsPrefixRef:x}=K(o),g=H(o),{mergedSizeRef:R,mergedDisabledRef:S}=g,s=P(o.defaultValue),w=I(()=>o.value),u=V(w,s),a=I(()=>{var h;return((h=u.value)===null||h===void 0?void 0:h.length)||0}),c=I(()=>Array.isArray(u.value)?new Set(u.value):new Set);function M(h,r){const{nTriggerFormInput:p,nTriggerFormChange:C}=g,{onChange:f,"onUpdate:value":k,onUpdateValue:v}=o;if(Array.isArray(u.value)){const i=Array.from(u.value),B=i.findIndex(U=>U===r);h?~B||(i.push(r),v&&l(v,i,{actionType:"check",value:r}),k&&l(k,i,{actionType:"check",value:r}),p(),C(),s.value=i,f&&l(f,i)):~B&&(i.splice(B,1),v&&l(v,i,{actionType:"uncheck",value:r}),k&&l(k,i,{actionType:"uncheck",value:r}),f&&l(f,i),s.value=i,p(),C())}else h?(v&&l(v,[r],{actionType:"check",value:r}),k&&l(k,[r],{actionType:"check",value:r}),f&&l(f,[r]),s.value=[r],p(),C()):(v&&l(v,[],{actionType:"uncheck",value:r}),k&&l(k,[],{actionType:"uncheck",value:r}),f&&l(f,[]),s.value=[],p(),C())}return te(G,{checkedCountRef:a,maxRef:N(o,"max"),minRef:N(o,"min"),valueSetRef:c,disabledRef:S,mergedSizeRef:R,toggleCheckbox:M}),{mergedClsPrefix:x}},render(){return t("div",{class:`${this.mergedClsPrefix}-checkbox-group`,role:"group"},this.$slots)}}),ze=b([n("checkbox",`
 line-height: var(--n-label-line-height);
 font-size: var(--n-font-size);
 outline: none;
 cursor: pointer;
 display: inline-flex;
 flex-wrap: nowrap;
 align-items: flex-start;
 word-break: break-word;
 --n-merged-color-table: var(--n-color-table);
 `,[b("&:hover",[n("checkbox-box",[y("border",{border:"var(--n-border-checked)"})])]),b("&:focus:not(:active)",[n("checkbox-box",[y("border",`
 border: var(--n-border-focus);
 box-shadow: var(--n-box-shadow-focus);
 `)])]),A("inside-table",[n("checkbox-box",`
 background-color: var(--n-merged-color-table);
 `)]),A("checked",[n("checkbox-box",`
 background-color: var(--n-color-checked);
 `,[n("checkbox-icon",[b(".check-icon",`
 opacity: 1;
 transform: scale(1);
 `)])])]),A("indeterminate",[n("checkbox-box",[n("checkbox-icon",[b(".check-icon",`
 opacity: 0;
 transform: scale(.5);
 `),b(".line-icon",`
 opacity: 1;
 transform: scale(1);
 `)])])]),A("checked, indeterminate",[b("&:focus:not(:active)",[n("checkbox-box",[y("border",`
 border: var(--n-border-checked);
 box-shadow: var(--n-box-shadow-focus);
 `)])]),n("checkbox-box",`
 background-color: var(--n-color-checked);
 border-left: 0;
 border-top: 0;
 `,[y("border",{border:"var(--n-border-checked)"})])]),A("disabled",{cursor:"not-allowed"},[A("checked",[n("checkbox-box",`
 background-color: var(--n-color-disabled-checked);
 `,[y("border",{border:"var(--n-border-disabled-checked)"}),n("checkbox-icon",[b(".check-icon, .line-icon",{fill:"var(--n-check-mark-color-disabled-checked)"})])])]),n("checkbox-box",`
 background-color: var(--n-color-disabled);
 `,[y("border",{border:"var(--n-border-disabled)"}),n("checkbox-icon",[b(".check-icon, .line-icon",{fill:"var(--n-check-mark-color-disabled)"})])]),y("label",{color:"var(--n-text-color-disabled)"})]),n("checkbox-box-wrapper",`
 position: relative;
 width: var(--n-size);
 flex-shrink: 0;
 flex-grow: 0;
 user-select: none;
 -webkit-user-select: none;
 `),n("checkbox-box",`
 position: absolute;
 left: 0;
 top: 50%;
 transform: translateY(-50%);
 height: var(--n-size);
 width: var(--n-size);
 display: inline-block;
 box-sizing: border-box;
 border-radius: var(--n-border-radius);
 background-color: var(--n-color);
 transition: background-color 0.3s var(--n-bezier);
 `,[y("border",`
 transition:
 border-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 border-radius: inherit;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 border: var(--n-border);
 `),n("checkbox-icon",`
 display: flex;
 align-items: center;
 justify-content: center;
 position: absolute;
 left: 1px;
 right: 1px;
 top: 1px;
 bottom: 1px;
 `,[b(".check-icon, .line-icon",`
 width: 100%;
 fill: var(--n-check-mark-color);
 opacity: 0;
 transform: scale(0.5);
 transform-origin: center;
 transition:
 fill 0.3s var(--n-bezier),
 transform 0.3s var(--n-bezier),
 opacity 0.3s var(--n-bezier),
 border-color 0.3s var(--n-bezier);
 `),ue({left:"1px",top:"1px"})])]),y("label",`
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 user-select: none;
 -webkit-user-select: none;
 padding: var(--n-label-padding);
 `,[b("&:empty",{display:"none"})])]),be(n("checkbox",`
 --n-merged-color-table: var(--n-color-table-modal);
 `)),he(n("checkbox",`
 --n-merged-color-table: var(--n-color-table-popover);
 `))]),Se=Object.assign(Object.assign({},E.props),{size:String,checked:{type:[Boolean,String,Number],default:void 0},defaultChecked:{type:[Boolean,String,Number],default:!1},value:[String,Number],disabled:{type:Boolean,default:void 0},indeterminate:Boolean,label:String,focusable:{type:Boolean,default:!0},checkedValue:{type:[Boolean,String,Number],default:!0},uncheckedValue:{type:[Boolean,String,Number],default:!1},"onUpdate:checked":[Function,Array],onUpdateChecked:[Function,Array],privateInsideTable:Boolean,onChange:[Function,Array]}),Ie=j({name:"Checkbox",props:Se,setup(o){const x=P(null),{mergedClsPrefixRef:g,inlineThemeDisabled:R,mergedRtlRef:S}=K(o),s=H(o,{mergedSize(e){const{size:m}=o;if(m!==void 0)return m;if(a){const{value:d}=a.mergedSizeRef;if(d!==void 0)return d}if(e){const{mergedSize:d}=e;if(d!==void 0)return d.value}return"medium"},mergedDisabled(e){const{disabled:m}=o;if(m!==void 0)return m;if(a){if(a.disabledRef.value)return!0;const{maxRef:{value:d},checkedCountRef:z}=a;if(d!==void 0&&z.value>=d&&!r.value)return!0;const{minRef:{value:D}}=a;if(D!==void 0&&z.value<=D&&r.value)return!0}return e?e.disabled.value:!1}}),{mergedDisabledRef:w,mergedSizeRef:u}=s,a=fe(G,null),c=P(o.defaultChecked),M=N(o,"checked"),h=V(M,c),r=ke(()=>{if(a){const e=a.valueSetRef.value;return e&&o.value!==void 0?e.has(o.value):!1}else return h.value===o.checkedValue}),p=E("Checkbox","-checkbox",ze,pe,o,g);function C(e){if(a&&o.value!==void 0)a.toggleCheckbox(!r.value,o.value);else{const{onChange:m,"onUpdate:checked":d,onUpdateChecked:z}=o,{nTriggerFormInput:D,nTriggerFormChange:F}=s,$=r.value?o.uncheckedValue:o.checkedValue;d&&l(d,$,e),z&&l(z,$,e),m&&l(m,$,e),D(),F(),c.value=$}}function f(e){w.value||C(e)}function k(e){if(!w.value)switch(e.key){case" ":case"Enter":C(e)}}function v(e){switch(e.key){case" ":e.preventDefault()}}const i={focus:()=>{var e;(e=x.value)===null||e===void 0||e.focus()},blur:()=>{var e;(e=x.value)===null||e===void 0||e.blur()}},B=ve("Checkbox",S,g),U=I(()=>{const{value:e}=u,{common:{cubicBezierEaseInOut:m},self:{borderRadius:d,color:z,colorChecked:D,colorDisabled:F,colorTableHeader:$,colorTableHeaderModal:L,colorTableHeaderPopover:O,checkMarkColor:Y,checkMarkColorDisabled:q,border:Q,borderFocus:X,borderDisabled:J,borderChecked:W,boxShadowFocus:Z,textColor:ee,textColorDisabled:oe,checkMarkColorDisabledChecked:re,colorDisabledChecked:ne,borderDisabledChecked:ce,labelPadding:ae,labelLineHeight:le,[_("fontSize",e)]:ie,[_("size",e)]:de}}=p.value;return{"--n-label-line-height":le,"--n-size":de,"--n-bezier":m,"--n-border-radius":d,"--n-border":Q,"--n-border-checked":W,"--n-border-focus":X,"--n-border-disabled":J,"--n-border-disabled-checked":ce,"--n-box-shadow-focus":Z,"--n-color":z,"--n-color-checked":D,"--n-color-table":$,"--n-color-table-modal":L,"--n-color-table-popover":O,"--n-color-disabled":F,"--n-color-disabled-checked":ne,"--n-text-color":ee,"--n-text-color-disabled":oe,"--n-check-mark-color":Y,"--n-check-mark-color-disabled":q,"--n-check-mark-color-disabled-checked":re,"--n-font-size":ie,"--n-label-padding":ae}}),T=R?me("checkbox",I(()=>u.value[0]),U,o):void 0;return Object.assign(s,i,{rtlEnabled:B,selfRef:x,mergedClsPrefix:g,mergedDisabled:w,renderedChecked:r,mergedTheme:p,labelId:xe(),handleClick:f,handleKeyUp:k,handleKeyDown:v,cssVars:R?void 0:U,themeClass:T==null?void 0:T.themeClass,onRender:T==null?void 0:T.onRender})},render(){var o;const{$slots:x,renderedChecked:g,mergedDisabled:R,indeterminate:S,privateInsideTable:s,cssVars:w,labelId:u,label:a,mergedClsPrefix:c,focusable:M,handleKeyUp:h,handleKeyDown:r,handleClick:p}=this;return(o=this.onRender)===null||o===void 0||o.call(this),t("div",{ref:"selfRef",class:[`${c}-checkbox`,this.themeClass,this.rtlEnabled&&`${c}-checkbox--rtl`,g&&`${c}-checkbox--checked`,R&&`${c}-checkbox--disabled`,S&&`${c}-checkbox--indeterminate`,s&&`${c}-checkbox--inside-table`],tabindex:R||!M?void 0:0,role:"checkbox","aria-checked":S?"mixed":g,"aria-labelledby":u,style:w,onKeyup:h,onKeydown:r,onClick:p,onMousedown:()=>{Ce("selectstart",window,C=>{C.preventDefault()},{once:!0})}},t("div",{class:`${c}-checkbox-box-wrapper`},"\xA0",t("div",{class:`${c}-checkbox-box`},t(ge,null,{default:()=>this.indeterminate?t("div",{key:"indeterminate",class:`${c}-checkbox-icon`},Re):t("div",{key:"check",class:`${c}-checkbox-icon`},ye)}),t("div",{class:`${c}-checkbox-box__border`}))),a!==null||x.default?t("span",{class:`${c}-checkbox__label`,id:u},x.default?x.default():a):null)}});export{Be as N,Ie as a};

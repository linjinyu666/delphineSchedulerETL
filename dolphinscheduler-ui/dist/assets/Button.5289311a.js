import{l as O,d as Z,$ as $e,X as Se,r as B,U as Be,a2 as Te,h as p,k as b,W as Pe,ai as ee,V as ke,n as x,p as l,_ as Y,aj as Re,e as oe,a0 as He,S as Ee,g as R,b as Oe,f as je,t as Ie,ak as De,al as Ne,O as Fe,a7 as _e,j as r,ad as H}from"./index.e2a499a0.js";import{i as Ke}from"./browser.7502e29f.js";import{i as Me}from"./is-browser.45c3bd93.js";import{u as Ge,c as A}from"./use-form-item.f54209ce.js";import{r as J,i as Ve,c as We}from"./resolve-slot.8e13efbe.js";const qe=O("base-wave",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 border-radius: inherit;
`),Qe=Z({name:"BaseWave",props:{clsPrefix:{type:String,required:!0}},setup(e){$e("-base-wave",qe,Se(e,"clsPrefix"));const f=B(null),h=B(!1);let u=null;return Be(()=>{u!==null&&window.clearTimeout(u)}),{active:h,selfRef:f,play(){u!==null&&(window.clearTimeout(u),h.value=!1,u=null),Te(()=>{var v;(v=f.value)===null||v===void 0||v.offsetHeight,h.value=!0,u=window.setTimeout(()=>{h.value=!1,u=null},1e3)})}}},render(){const{clsPrefix:e}=this;return p("div",{ref:"selfRef","aria-hidden":!0,class:[`${e}-base-wave`,this.active&&`${e}-base-wave--active`]})}}),{cubicBezierEaseInOut:C}=Pe;function Xe({duration:e=".2s",delay:f=".1s"}={}){return[b("&.fade-in-width-expand-transition-leave-from, &.fade-in-width-expand-transition-enter-to",{opacity:1}),b("&.fade-in-width-expand-transition-leave-to, &.fade-in-width-expand-transition-enter-from",`
 opacity: 0!important;
 margin-left: 0!important;
 margin-right: 0!important;
 `),b("&.fade-in-width-expand-transition-leave-active",`
 overflow: hidden;
 transition:
 opacity ${e} ${C},
 max-width ${e} ${C} ${f},
 margin-left ${e} ${C} ${f},
 margin-right ${e} ${C} ${f};
 `),b("&.fade-in-width-expand-transition-enter-active",`
 overflow: hidden;
 transition:
 opacity ${e} ${C} ${f},
 max-width ${e} ${C},
 margin-left ${e} ${C},
 margin-right ${e} ${C};
 `)]}function $(e){return ee(e,[255,255,255,.16])}function E(e){return ee(e,[0,0,0,.12])}const Le=ke("n-button-group"),Ue=b([O("button",`
 margin: 0;
 font-weight: var(--n-font-weight);
 line-height: 1;
 font-family: inherit;
 padding: var(--n-padding);
 height: var(--n-height);
 font-size: var(--n-font-size);
 border-radius: var(--n-border-radius);
 color: var(--n-text-color);
 background-color: var(--n-color);
 width: var(--n-width);
 white-space: nowrap;
 outline: none;
 position: relative;
 z-index: auto;
 border: none;
 display: inline-flex;
 flex-wrap: nowrap;
 flex-shrink: 0;
 align-items: center;
 justify-content: center;
 user-select: none;
 -webkit-user-select: none;
 text-align: center;
 cursor: pointer;
 text-decoration: none;
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 opacity .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[x("color",[l("border",{borderColor:"var(--n-border-color)"}),x("disabled",[l("border",{borderColor:"var(--n-border-color-disabled)"})]),Y("disabled",[b("&:focus",[l("state-border",{borderColor:"var(--n-border-color-focus)"})]),b("&:hover",[l("state-border",{borderColor:"var(--n-border-color-hover)"})]),b("&:active",[l("state-border",{borderColor:"var(--n-border-color-pressed)"})]),x("pressed",[l("state-border",{borderColor:"var(--n-border-color-pressed)"})])])]),x("disabled",{backgroundColor:"var(--n-color-disabled)",color:"var(--n-text-color-disabled)"},[l("border",{border:"var(--n-border-disabled)"})]),Y("disabled",[b("&:focus",{backgroundColor:"var(--n-color-focus)",color:"var(--n-text-color-focus)"},[l("state-border",{border:"var(--n-border-focus)"})]),b("&:hover",{backgroundColor:"var(--n-color-hover)",color:"var(--n-text-color-hover)"},[l("state-border",{border:"var(--n-border-hover)"})]),b("&:active",{backgroundColor:"var(--n-color-pressed)",color:"var(--n-text-color-pressed)"},[l("state-border",{border:"var(--n-border-pressed)"})]),x("pressed",{backgroundColor:"var(--n-color-pressed)",color:"var(--n-text-color-pressed)"},[l("state-border",{border:"var(--n-border-pressed)"})])]),x("loading","cursor: wait;"),O("base-wave",`
 pointer-events: none;
 top: 0;
 right: 0;
 bottom: 0;
 left: 0;
 animation-iteration-count: 1;
 animation-duration: var(--n-ripple-duration);
 animation-timing-function: var(--n-bezier-ease-out), var(--n-bezier-ease-out);
 `,[x("active",{zIndex:1,animationName:"button-wave-spread, button-wave-opacity"})]),Me&&"MozBoxSizing"in document.createElement("div").style?b("&::moz-focus-inner",{border:0}):null,l("border, state-border",`
 position: absolute;
 left: 0;
 top: 0;
 right: 0;
 bottom: 0;
 border-radius: inherit;
 transition: border-color .3s var(--n-bezier);
 pointer-events: none;
 `),l("border",{border:"var(--n-border)"}),l("state-border",{border:"var(--n-border)",borderColor:"#0000",zIndex:1}),l("icon",`
 margin: var(--n-icon-margin);
 margin-left: 0;
 height: var(--n-icon-size);
 width: var(--n-icon-size);
 max-width: var(--n-icon-size);
 font-size: var(--n-icon-size);
 position: relative;
 flex-shrink: 0;
 `,[O("icon-slot",`
 height: var(--n-icon-size);
 width: var(--n-icon-size);
 position: absolute;
 left: 0;
 top: 50%;
 transform: translateY(-50%);
 display: flex;
 align-items: center;
 justify-content: center;
 `,[Re({top:"50%",originalTransform:"translateY(-50%)"})]),Xe()]),l("content",`
 display: flex;
 align-items: center;
 flex-wrap: nowrap;
 min-width: 0;
 `,[b("~",[l("icon",{margin:"var(--n-icon-margin)",marginRight:0})])]),x("block",`
 display: flex;
 width: 100%;
 `),x("dashed",[l("border, state-border",{borderStyle:"dashed !important"})]),x("disabled",{cursor:"not-allowed",opacity:"var(--n-opacity-disabled)"})]),b("@keyframes button-wave-spread",{from:{boxShadow:"0 0 0.5px 0 var(--n-ripple-color)"},to:{boxShadow:"0 0 0.5px 4.5px var(--n-ripple-color)"}}),b("@keyframes button-wave-opacity",{from:{opacity:"var(--n-wave-opacity)"},to:{opacity:0}})]),Ye=Object.assign(Object.assign({},oe.props),{color:String,textColor:String,text:Boolean,block:Boolean,loading:Boolean,disabled:Boolean,circle:Boolean,size:String,ghost:Boolean,round:Boolean,secondary:Boolean,tertiary:Boolean,quaternary:Boolean,strong:Boolean,focusable:{type:Boolean,default:!0},keyboard:{type:Boolean,default:!0},tag:{type:String,default:"button"},type:{type:String,default:"default"},dashed:Boolean,iconPlacement:{type:String,default:"left"},attrType:{type:String,default:"button"},bordered:{type:Boolean,default:!0},onClick:[Function,Array],nativeFocusBehavior:{type:Boolean,default:!Ke}}),re=Z({name:"Button",props:Ye,setup(e){const f=B(null),h=B(null),u=B(!1),v=He(()=>!e.quaternary&&!e.tertiary&&!e.secondary&&!e.text&&(!e.color||e.ghost||e.dashed)&&e.bordered),te=Ee(Le,{}),{mergedSizeRef:j}=Ge({},{defaultSize:"medium",mergedSize:t=>{const{size:d}=e;if(d)return d;const{size:y}=te;if(y)return y;const{mergedSize:o}=t||{};return o?o.value:"medium"}}),I=R(()=>e.focusable&&!e.disabled),ne=t=>{var d;I.value||t.preventDefault(),!e.nativeFocusBehavior&&(t.preventDefault(),!e.disabled&&I.value&&((d=f.value)===null||d===void 0||d.focus({preventScroll:!0})))},ie=t=>{var d;if(!e.disabled&&!e.loading){const{onClick:y}=e;y&&We(y,t),e.text||(d=h.value)===null||d===void 0||d.play()}},ae=t=>{switch(t.key){case"Enter":if(!e.keyboard)return;u.value=!1}},se=t=>{switch(t.key){case"Enter":if(!e.keyboard||e.loading){t.preventDefault();return}u.value=!0}},le=()=>{u.value=!1},{inlineThemeDisabled:q,mergedClsPrefixRef:D,mergedRtlRef:de}=Oe(e),ce=oe("Button","-button",Ue,_e,e,D),ue=je("Button",de,D),Q=R(()=>{const t=ce.value,{common:{cubicBezierEaseInOut:d,cubicBezierEaseOut:y},self:o}=t,{rippleDuration:N,opacityDisabled:T,fontWeight:F,fontWeightStrong:_}=o,m=j.value,{dashed:K,type:w,ghost:M,text:g,color:i,round:X,circle:G,textColor:z,secondary:be,tertiary:L,quaternary:fe,strong:he}=e,ve={"font-weight":he?_:F};let a={"--n-color":"initial","--n-color-hover":"initial","--n-color-pressed":"initial","--n-color-focus":"initial","--n-color-disabled":"initial","--n-ripple-color":"initial","--n-text-color":"initial","--n-text-color-hover":"initial","--n-text-color-pressed":"initial","--n-text-color-focus":"initial","--n-text-color-disabled":"initial"};const P=w==="tertiary",U=w==="default",n=P?"default":w;if(g){const s=z||i;a={"--n-color":"#0000","--n-color-hover":"#0000","--n-color-pressed":"#0000","--n-color-focus":"#0000","--n-color-disabled":"#0000","--n-ripple-color":"#0000","--n-text-color":s||o[r("textColorText",n)],"--n-text-color-hover":s?$(s):o[r("textColorTextHover",n)],"--n-text-color-pressed":s?E(s):o[r("textColorTextPressed",n)],"--n-text-color-focus":s?$(s):o[r("textColorTextHover",n)],"--n-text-color-disabled":s||o[r("textColorTextDisabled",n)]}}else if(M||K){const s=z||i;a={"--n-color":"#0000","--n-color-hover":"#0000","--n-color-pressed":"#0000","--n-color-focus":"#0000","--n-color-disabled":"#0000","--n-ripple-color":i||o[r("rippleColor",n)],"--n-text-color":s||o[r("textColorGhost",n)],"--n-text-color-hover":s?$(s):o[r("textColorGhostHover",n)],"--n-text-color-pressed":s?E(s):o[r("textColorGhostPressed",n)],"--n-text-color-focus":s?$(s):o[r("textColorGhostHover",n)],"--n-text-color-disabled":s||o[r("textColorGhostDisabled",n)]}}else if(be){const s=U?o.textColor:P?o.textColorTertiary:o[r("color",n)],c=i||s,k=w!=="default"&&w!=="tertiary";a={"--n-color":k?H(c,{alpha:Number(o.colorOpacitySecondary)}):o.colorSecondary,"--n-color-hover":k?H(c,{alpha:Number(o.colorOpacitySecondaryHover)}):o.colorSecondaryHover,"--n-color-pressed":k?H(c,{alpha:Number(o.colorOpacitySecondaryPressed)}):o.colorSecondaryPressed,"--n-color-focus":k?H(c,{alpha:Number(o.colorOpacitySecondaryHover)}):o.colorSecondaryHover,"--n-color-disabled":o.colorSecondary,"--n-ripple-color":"#0000","--n-text-color":c,"--n-text-color-hover":c,"--n-text-color-pressed":c,"--n-text-color-focus":c,"--n-text-color-disabled":c}}else if(L||fe){const s=U?o.textColor:P?o.textColorTertiary:o[r("color",n)],c=i||s;L?(a["--n-color"]=o.colorTertiary,a["--n-color-hover"]=o.colorTertiaryHover,a["--n-color-pressed"]=o.colorTertiaryPressed,a["--n-color-focus"]=o.colorSecondaryHover,a["--n-color-disabled"]=o.colorTertiary):(a["--n-color"]=o.colorQuaternary,a["--n-color-hover"]=o.colorQuaternaryHover,a["--n-color-pressed"]=o.colorQuaternaryPressed,a["--n-color-focus"]=o.colorQuaternaryHover,a["--n-color-disabled"]=o.colorQuaternary),a["--n-ripple-color"]="#0000",a["--n-text-color"]=c,a["--n-text-color-hover"]=c,a["--n-text-color-pressed"]=c,a["--n-text-color-focus"]=c,a["--n-text-color-disabled"]=c}else a={"--n-color":i||o[r("color",n)],"--n-color-hover":i?$(i):o[r("colorHover",n)],"--n-color-pressed":i?E(i):o[r("colorPressed",n)],"--n-color-focus":i?$(i):o[r("colorFocus",n)],"--n-color-disabled":i||o[r("colorDisabled",n)],"--n-ripple-color":i||o[r("rippleColor",n)],"--n-text-color":z||(i?o.textColorPrimary:P?o.textColorTertiary:o[r("textColor",n)]),"--n-text-color-hover":z||(i?o.textColorHoverPrimary:o[r("textColorHover",n)]),"--n-text-color-pressed":z||(i?o.textColorPressedPrimary:o[r("textColorPressed",n)]),"--n-text-color-focus":z||(i?o.textColorFocusPrimary:o[r("textColorFocus",n)]),"--n-text-color-disabled":z||(i?o.textColorDisabledPrimary:o[r("textColorDisabled",n)])};let V={"--n-border":"initial","--n-border-hover":"initial","--n-border-pressed":"initial","--n-border-focus":"initial","--n-border-disabled":"initial"};g?V={"--n-border":"none","--n-border-hover":"none","--n-border-pressed":"none","--n-border-focus":"none","--n-border-disabled":"none"}:V={"--n-border":o[r("border",n)],"--n-border-hover":o[r("borderHover",n)],"--n-border-pressed":o[r("borderPressed",n)],"--n-border-focus":o[r("borderFocus",n)],"--n-border-disabled":o[r("borderDisabled",n)]};const{[r("height",m)]:W,[r("fontSize",m)]:pe,[r("padding",m)]:me,[r("paddingRound",m)]:xe,[r("iconSize",m)]:ye,[r("borderRadius",m)]:ge,[r("iconMargin",m)]:Ce,waveOpacity:we}=o,ze={"--n-width":G&&!g?W:"initial","--n-height":g?"initial":W,"--n-font-size":pe,"--n-padding":G||g?"initial":X?xe:me,"--n-icon-size":ye,"--n-icon-margin":Ce,"--n-border-radius":g?"initial":G||X?W:ge};return Object.assign(Object.assign(Object.assign(Object.assign({"--n-bezier":d,"--n-bezier-ease-out":y,"--n-ripple-duration":N,"--n-opacity-disabled":T,"--n-wave-opacity":we},ve),a),V),ze)}),S=q?Ie("button",R(()=>{let t="";const{dashed:d,type:y,ghost:o,text:N,color:T,round:F,circle:_,textColor:m,secondary:K,tertiary:w,quaternary:M,strong:g}=e;d&&(t+="a"),o&&(t+="b"),N&&(t+="c"),F&&(t+="d"),_&&(t+="e"),K&&(t+="f"),w&&(t+="g"),M&&(t+="h"),g&&(t+="i"),T&&(t+="j"+A(T)),m&&(t+="k"+A(m));const{value:i}=j;return t+="l"+i[0],t+="m"+y[0],t}),Q,e):void 0;return{selfElRef:f,waveElRef:h,mergedClsPrefix:D,mergedFocusable:I,mergedSize:j,showBorder:v,enterPressed:u,rtlEnabled:ue,handleMousedown:ne,handleKeydown:se,handleBlur:le,handleKeyup:ae,handleClick:ie,customColorCssVars:R(()=>{const{color:t}=e;if(!t)return null;const d=$(t);return{"--n-border-color":t,"--n-border-color-hover":d,"--n-border-color-pressed":E(t),"--n-border-color-focus":d,"--n-border-color-disabled":t}}),cssVars:q?void 0:Q,themeClass:S==null?void 0:S.themeClass,onRender:S==null?void 0:S.onRender}},render(){const{mergedClsPrefix:e,tag:f,onRender:h}=this;h==null||h();const u=J(this.$slots.default,v=>v&&p("span",{class:`${e}-button__content`},v));return p(f,{ref:"selfElRef",class:[this.themeClass,`${e}-button`,`${e}-button--${this.type}-type`,`${e}-button--${this.mergedSize}-type`,this.rtlEnabled&&`${e}-button--rtl`,this.disabled&&`${e}-button--disabled`,this.block&&`${e}-button--block`,this.enterPressed&&`${e}-button--pressed`,!this.text&&this.dashed&&`${e}-button--dashed`,this.color&&`${e}-button--color`,this.secondary&&`${e}-button--secondary`,this.loading&&`${e}-button--loading`,this.ghost&&`${e}-button--ghost`],tabindex:this.mergedFocusable?0:-1,type:this.attrType,style:this.cssVars,disabled:this.disabled,onClick:this.handleClick,onBlur:this.handleBlur,onMousedown:this.handleMousedown,onKeyup:this.handleKeyup,onKeydown:this.handleKeydown},this.iconPlacement==="right"&&u,p(De,{width:!0},{default:()=>J(this.$slots.icon,v=>(this.loading||v)&&p("span",{class:`${e}-button__icon`,style:{margin:Ve(this.$slots.default)?"0":""}},p(Ne,null,{default:()=>this.loading?p(Fe,{clsPrefix:e,key:"loading",class:`${e}-icon-slot`,strokeWidth:20}):p("div",{key:"icon",class:`${e}-icon-slot`,role:"none"},v)})))}),this.iconPlacement==="left"&&u,this.text?null:p(Qe,{ref:"waveElRef",clsPrefix:e}),this.showBorder?p("div",{"aria-hidden":!0,class:`${e}-button__border`,style:this.customColorCssVars}):null,this.showBorder?p("div",{"aria-hidden":!0,class:`${e}-button__state-border`,style:this.customColorCssVars}):null)}}),ro=re,to=re;export{ro as N,to as X,Le as b};

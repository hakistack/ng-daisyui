import{a as K}from"./chunk-7NFJGNQ6.js";import{a as L,b as z,c as R}from"./chunk-LF3XQDBE.js";import{$ as A,C as M,E as g,G as d,N as b,O as a,P as w,Q as _,Y as c,Z as l,_ as h,cc as F,d as S,e as D,i as x,l as e,n as k,oc as H,pc as P,q as v,r as y,s as O,t as E,u as C,v as r,w as n,x as i,y as p}from"./chunk-XEMU7XGV.js";import"./chunk-DAQOROHW.js";var U=()=>({trigger:"click",duration:.5}),j=()=>[1,1.2,1],I=t=>({scale:t}),W=()=>({trigger:"click",duration:.3}),q=()=>[0,360],$=t=>({rotate:t}),G=(t,s)=>[0,t,10,s,10,0],Y=t=>({x:t}),Z=()=>({trigger:"click",duration:.4}),J=()=>({trigger:"immediate",duration:.5}),Q=()=>({trigger:"immediate",duration:.5,delay:.1}),X=()=>({trigger:"immediate",duration:.5,delay:.2}),ee=()=>({trigger:"immediate",duration:.5,delay:.3}),te=t=>({trigger:"immediate",duration:.4,delay:t}),ie=()=>[1,1.1],f=()=>({duration:.2}),ne=()=>[1,.95],oe=()=>[0,5],B=t=>[0,t],ae=t=>({y:t}),re=()=>[1,1.05],ce=()=>["0 4px 6px -1px rgba(0,0,0,0.1)","0 20px 25px -5px rgba(0,0,0,0.15)"],se=(t,s,o)=>({scale:t,y:s,boxShadow:o}),me=()=>({duration:.3,ease:"easeOut"}),N=()=>[1,1.02],T=()=>[0,1],pe=(t,s)=>({scale:t,rotate:s}),le=()=>[0,4],de=(t,s)=>({x:t,scale:s}),ue=()=>[30,0],ve=t=>[t,0],ye=(t,s,o)=>({opacity:t,y:s,rotate:o}),ge=()=>({trigger:"scroll",duration:.8,ease:"easeOut"}),be=()=>[.8,1.1,1],fe=(t,s)=>({scale:t,opacity:s}),xe=()=>({trigger:"scroll",duration:.6}),he=()=>({trigger:"click",duration:.6});function _e(t,s){t&1&&(n(0,"div",8)(1,"div",18),a(2," Fade In "),i(),n(3,"div",19),a(4," Fade In Up "),i(),n(5,"div",20),a(6," Fade In Down "),i(),n(7,"div",21),a(8," Zoom In "),i()()),t&2&&(e(),r("motionAnimate","fadeIn")("motionOptions",c(8,J)),e(2),r("motionAnimate","fadeInUp")("motionOptions",c(9,Q)),e(2),r("motionAnimate","fadeInDown")("motionOptions",c(10,X)),e(2),r("motionAnimate","zoomIn")("motionOptions",c(11,ee)))}function Se(t,s){if(t&1&&(n(0,"div",22),p(1,"hk-lucide-icon",23),n(2,"span"),a(3),i()()),t&2){let o=s.$implicit,m=s.$index;r("motionAnimate","fadeInLeft")("motionOptions",l(5,te,m*.1)),e(),r("name",o.icon)("size",20),e(2),w(o.label)}}function De(t,s){if(t&1&&(n(0,"div",17),E(1,Se,4,7,"div",22,O),i()),t&2){let o=d(2);e(),C(o.staggerItems)}}function Oe(t,s){if(t&1){let o=M();n(0,"div",4)(1,"app-doc-section",6)(2,"button",7),g("click",function(){S(o);let u=d();return D(u.toggleLoadDemo())}),a(3),i(),v(4,_e,9,12,"div",8),i(),n(5,"app-doc-section",9)(6,"div",10)(7,"button",11),a(8," Bounce "),i(),n(9,"button",12),a(10," Pulse "),i(),n(11,"button",13),p(12,"hk-lucide-icon",14),a(13," Spin "),i(),n(14,"button",15),a(15," Shake "),i()()(),n(16,"app-doc-section",16)(17,"button",7),g("click",function(){S(o);let u=d();return D(u.toggleStaggerDemo())}),a(18),i(),v(19,De,3,0,"div",17),i()()}if(t&2){let o=d();e(),r("codeExample",o.loadCode),e(2),_("",o.showLoadDemo()?"Hide":"Show"," Elements"),e(),y(o.showLoadDemo()?4:-1),e(),r("codeExample",o.clickCode),e(2),r("motionAnimate","bounceIn")("motionOptions",c(16,U)),e(2),r("motionAnimate",l(18,I,c(17,j)))("motionOptions",c(20,W)),e(2),r("motionAnimate",l(22,$,c(21,q)))("motionOptions",c(24,U)),e(),r("size",18),e(2),r("motionAnimate",l(28,Y,h(25,G,-10,-10)))("motionOptions",c(30,Z)),e(2),r("codeExample",o.staggerCode),e(2),_("",o.showStaggerDemo()?"Reset":"Animate"," List"),e(),y(o.showStaggerDemo()?19:-1)}}function Ee(t,s){if(t&1&&(n(0,"div",4)(1,"app-doc-section",24)(2,"div",25)(3,"div",26),a(4," Scale Up "),i(),n(5,"div",27),a(6," Scale Down "),i(),n(7,"div",28),a(8," Rotate "),i(),n(9,"div",29),a(10," Lift Up "),i()()(),n(11,"app-doc-section",30)(12,"div",31)(13,"div",32),p(14,"hk-lucide-icon",33),n(15,"h3",34),a(16,"Card Lift"),i(),n(17,"p",35),a(18,"Scales up with elevated shadow"),i()(),n(19,"div",36),p(20,"hk-lucide-icon",37),n(21,"h3",34),a(22,"Subtle Tilt"),i(),n(23,"p",35),a(24,"Gentle scale with rotation"),i()(),n(25,"div",38),p(26,"hk-lucide-icon",39),n(27,"h3",34),a(28,"Slide Right"),i(),n(29,"p",35),a(30,"Suggests forward navigation"),i()()()()()),t&2){let o=d();e(),r("codeExample",o.hoverCode),e(2),r("motionHover",l(20,I,c(19,ie)))("animationOptions",c(22,f)),e(2),r("motionHover",l(24,I,c(23,ne)))("animationOptions",c(26,f)),e(2),r("motionHover",l(28,$,c(27,oe)))("animationOptions",c(30,f)),e(2),r("motionHover",l(33,ae,l(31,B,-8)))("animationOptions",c(35,f)),e(2),r("codeExample",o.combinedHoverCode),e(2),r("motionHover",A(40,se,c(36,re),l(37,B,-4),c(39,ce)))("animationOptions",c(44,me)),e(),r("size",32),e(5),r("motionHover",h(47,pe,c(45,N),c(46,T)))("animationOptions",c(50,f)),e(),r("size",32),e(5),r("motionHover",h(53,de,c(51,le),c(52,N)))("animationOptions",c(56,f)),e(),r("size",32)}}function Ce(t,s){if(t&1&&(n(0,"button",42),a(1),i()),t&2){let o=s.$implicit;r("motionAnimate",o)("motionOptions",c(3,he)),e(),_(" ",o," ")}}function Ae(t,s){if(t&1&&(n(0,"div",4)(1,"app-doc-section",40)(2,"div",41),E(3,Ce,2,4,"button",42,O),i()(),n(5,"app-doc-section",43)(6,"div",44)(7,"div",45),a(8," Custom: Fade + Slide + Rotate "),i(),n(9,"div",46),a(10," Custom: Bounce Scale In "),i()()()()),t&2){let o=d();e(),r("codeExample",o.presetCode),e(2),C(o.presets),e(2),r("codeExample",o.customCode),e(2),r("motionAnimate",A(10,ye,c(6,T),c(7,ue),l(8,ve,-10)))("motionOptions",c(14,ge)),e(2),r("motionAnimate",h(17,fe,c(15,be),c(16,T)))("motionOptions",c(20,xe))}}function Ie(t,s){if(t&1&&(n(0,"div",4),p(1,"app-api-table",47)(2,"app-api-table",48),n(3,"div",49)(4,"div",50)(5,"h3",51),a(6,"Available Presets"),i(),n(7,"p",52),a(8," Built-in animation presets that can be passed as a string to the "),n(9,"code"),a(10,"[motionAnimate]"),i(),a(11," input. Each preset defines a complete set of keyframes for common animation patterns. "),i(),p(12,"app-code-block",53),i()(),n(13,"div",49)(14,"div",50)(15,"h3",51),a(16,"Usage"),i(),n(17,"p",52),a(18," Import "),n(19,"code"),a(20,"MotionAnimateDirective"),i(),a(21," and apply it to any element. You can use a preset name or supply custom keyframe objects for full control over the animation. "),i(),p(22,"app-code-block",53),i()()()),t&2){let o=d();e(),r("entries",o.animateDocs),e(),r("entries",o.animateMethodDocs),e(10),r("code",o.presetsListCode),e(10),r("code",o.usageCode)}}function Te(t,s){if(t&1&&(n(0,"div",4),p(1,"app-api-table",54)(2,"app-api-table",55)(3,"app-api-table",48)(4,"app-api-table",56),i()),t&2){let o=d();e(),r("entries",o.hoverDocs),e(),r("entries",o.hoverOutputDocs),e(),r("entries",o.hoverMethodDocs),e(),r("entries",o.hoverOptionsDocs)}}function ke(t,s){if(t&1&&(n(0,"div",4),p(1,"app-api-table",57)(2,"app-api-table",55)(3,"app-api-table",48)(4,"app-api-table",58),i()),t&2){let o=d();e(),r("entries",o.scrollDocs),e(),r("entries",o.scrollOutputDocs),e(),r("entries",o.scrollMethodDocs),e(),r("entries",o.scrollInfoDocs)}}function Me(t,s){if(t&1&&(n(0,"div",4),p(1,"app-api-table",59),n(2,"div",49)(3,"div",50)(4,"h3",51),a(5,"AnimationPreset"),i(),n(6,"p",52),a(7," Union type of all built-in preset animation names. Pass one of these strings to the "),n(8,"code"),a(9,"[motionAnimate]"),i(),a(10," input to use a pre-defined animation. "),i(),p(11,"app-code-block",53),i()(),n(12,"div",49)(13,"div",50)(14,"h3",51),a(15,"HoverKeyframes"),i(),n(16,"p",52),a(17," A record of CSS property names to keyframe value arrays. Each property maps to a two-element array representing the start and end values for the hover transition. "),i(),p(18,"app-code-block",53),i()(),n(19,"div",49)(20,"div",50)(21,"h3",51),a(22,"Easing"),i(),n(23,"p",52),a(24," Accepts a named easing string (e.g., "),n(25,"code"),a(26,"'easeOut'"),i(),a(27,", "),n(28,"code"),a(29,"'easeInOut'"),i(),a(30,"), a CSS cubic-bezier array "),n(31,"code"),a(32,"[n, n, n, n]"),i(),a(33,", or a custom easing function. "),i(),p(34,"app-code-block",53),i()()()),t&2){let o=d();e(),r("entries",o.optionDocs),e(10),r("code",o.typeAnimationPreset),e(7),r("code",o.typeHoverKeyframes),e(16),r("code",o.typeEasing)}}var V=class t{activeTab=x("animate");apiTab=x("animate-directive");showLoadDemo=x(!0);showStaggerDemo=x(!1);presets=["fadeIn","fadeOut","fadeInUp","fadeInDown","fadeInLeft","fadeInRight","zoomIn","zoomOut","slideInUp","slideInDown","bounceIn","rotateIn"];staggerItems=[{icon:"Inbox",label:"Inbox - 12 new messages"},{icon:"Star",label:"Starred - 5 items"},{icon:"Send",label:"Sent - 23 messages"},{icon:"Archive",label:"Archive - 156 items"},{icon:"Trash2",label:"Trash - 3 items"}];toggleLoadDemo(){this.showLoadDemo.update(s=>!s)}toggleStaggerDemo(){this.showStaggerDemo.set(!1),setTimeout(()=>this.showStaggerDemo.set(!0),50)}loadCode=`// TypeScript
loadAnimation: MotionDirectiveOptions = {
  trigger: 'immediate',
  duration: 0.5,
  delay: 0.1,
};

// Template
<div
  [motionAnimate]="'fadeInUp'"
  [motionOptions]="loadAnimation">
  Content
</div>`;clickCode=`// TypeScript
bounceOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.5 };
pulseKeyframes = { scale: [1, 1.2, 1] };
pulseOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.3 };

// Template
<!-- Preset animation -->
<button
  [motionAnimate]="'bounceIn'"
  [motionOptions]="bounceOptions">
  Bounce
</button>

<!-- Custom keyframes -->
<button
  [motionAnimate]="pulseKeyframes"
  [motionOptions]="pulseOptions">
  Pulse
</button>`;staggerCode=`// TypeScript
items = [
  { icon: 'Inbox', label: 'Inbox - 12 new messages' },
  { icon: 'Star', label: 'Starred - 5 items' },
];

staggerOptions(index: number): MotionDirectiveOptions {
  return { trigger: 'immediate', duration: 0.4, delay: index * 0.1 };
}

// Template
@for (item of items; track item; let i = $index) {
  <div
    [motionAnimate]="'fadeInLeft'"
    [motionOptions]="staggerOptions(i)">
    {{ item.label }}
  </div>
}`;hoverCode=`// TypeScript
scaleHover: HoverKeyframes = { scale: [1, 1.1] };
hoverAnimOptions: HoverAnimationOptions = { duration: 0.2 };

// Template
<div
  [motionHover]="scaleHover"
  [animationOptions]="hoverAnimOptions">
  Hover me
</div>`;combinedHoverCode=`// TypeScript
cardLiftHover: HoverKeyframes = {
  scale: [1, 1.05],
  y: [0, -4],
  boxShadow: ['0 4px 6px rgba(0,0,0,0.1)', '0 20px 25px rgba(0,0,0,0.15)'],
};
cardLiftOptions: HoverAnimationOptions = { duration: 0.3, ease: 'easeOut' };

// Template
<div
  [motionHover]="cardLiftHover"
  [animationOptions]="cardLiftOptions">
  Card content
</div>`;presetCode=`// TypeScript
presetOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.6 };

// Template
<button
  [motionAnimate]="'bounceIn'"
  [motionOptions]="presetOptions">
  Click me
</button>`;customCode=`// TypeScript
customKeyframes = { opacity: [0, 1], y: [30, 0], rotate: [-10, 0] };
customOptions: MotionDirectiveOptions = {
  trigger: 'scroll',
  duration: 0.8,
  ease: 'easeOut',
};

// Template
<div
  [motionAnimate]="customKeyframes"
  [motionOptions]="customOptions">
  Custom animation
</div>`;presetsListCode=`// Available preset names:
'fadeIn'      'fadeOut'
'fadeInUp'    'fadeInDown'
'fadeInLeft'  'fadeInRight'
'zoomIn'      'zoomOut'
'slideInUp'   'slideInDown'
'bounceIn'    'rotateIn'`;usageCode=`import { MotionAnimateDirective, MotionHoverDirective } from '@hakistack/ng-daisyui';

@Component({
  imports: [MotionAnimateDirective, MotionHoverDirective],
  template: \`
    <!-- Animate directive -->
    <div
      [motionAnimate]="'fadeInUp'"
      [motionOptions]="{
        trigger: 'immediate',  // 'immediate' | 'click' | 'scroll'
        duration: 0.5,
        delay: 0,
        ease: 'easeOut',
      }">
      Animated content
    </div>

    <!-- Hover directive -->
    <div
      [motionHover]="{ scale: [1, 1.1] }"
      [animationOptions]="{ duration: 0.2 }">
      Hover effect
    </div>
  \`,
})`;animateDocs=[{name:"[motionAnimate]",type:"AnimationPreset | Record<string, unknown>",default:"'fadeIn'",description:"Preset name (e.g. 'fadeIn', 'bounceIn') or custom keyframes object"},{name:"[motionOptions]",type:"MotionDirectiveOptions",default:"{}",description:"Animation and trigger configuration options"}];animateMethodDocs=[{name:"play()",type:"void",description:"Programmatically trigger the animation"},{name:"stop()",type:"void",description:"Stop the currently running animation"},{name:"reset()",type:"void",description:"Reset the hasAnimated flag so the animation can play again"}];hoverDocs=[{name:"[motionHover]",type:"HoverKeyframes",description:"Required. Keyframes to animate on hover (e.g. { scale: [1, 1.1] })"},{name:"[hoverOptions]",type:"HoverOptions",default:"-",description:"Hover listener options (passive, once)"},{name:"[animationOptions]",type:"HoverAnimationOptions",default:"{ duration: 0.3, ease: 'easeOut' }",description:"Animation timing and easing configuration"},{name:"[restoreOnLeave]",type:"boolean",default:"true",description:"Whether to animate back to initial values on hover end"},{name:"[customRestoreKeyframes]",type:"HoverKeyframes",default:"-",description:"Custom keyframes for the restore animation instead of auto-captured values"}];hoverOutputDocs=[{name:"(hoverStart)",type:"PointerEvent",description:"Emits the PointerEvent when hover begins"},{name:"(hoverEnd)",type:"PointerEvent",description:"Emits the PointerEvent when hover ends"}];hoverMethodDocs=[{name:"triggerHover()",type:"void",description:"Programmatically trigger the hover-in animation"},{name:"triggerRestore()",type:"void",description:"Programmatically trigger the restore animation"},{name:"stop()",type:"void",description:"Stop all running hover/restore animations"}];scrollDocs=[{name:"[motionScroll]",type:"ScrollAnimationKeyframes | boolean",default:"-",description:"Scroll-linked keyframes object, or true for progress tracking only"},{name:"[scrollOptions]",type:"ScrollOptions",default:"{}",description:"Combined scroll configuration (container, target, axis, offset)"},{name:"[scrollContainer]",type:"HTMLElement",default:"-",description:"Scroll container element (shorthand for scrollOptions.container)"},{name:"[scrollTarget]",type:"HTMLElement",default:"host element",description:"Target element to track (shorthand for scrollOptions.target)"},{name:"[scrollAxis]",type:"'x' | 'y'",default:"'y'",description:"Scroll axis to track"},{name:"[scrollOffset]",type:"ScrollOffset",default:"-",description:"Scroll offset range, e.g. ['start', 'end']"},{name:"[animationOptions]",type:"ScrollAnimationOptions",default:"{ ease: 'linear' }",description:"Animation options for scroll-linked animations"}];scrollOutputDocs=[{name:"(scrollProgress)",type:"number",description:"Emits scroll progress from 0 to 1 (progress tracking mode)"},{name:"(scrollInfo)",type:"ScrollInfo",description:"Emits detailed scroll info with x/y current position, scrollLength, and velocity"}];scrollMethodDocs=[{name:"stop()",type:"void",description:"Stop the scroll animation and cleanup listeners"},{name:"restart()",type:"void",description:"Cleanup and re-initialize the scroll animation"}];optionDocs=[{name:"trigger",type:"'immediate' | 'click' | 'scroll'",default:"'immediate'",description:"What triggers the animation"},{name:"duration",type:"number",default:"0.6",description:"Animation duration in seconds"},{name:"delay",type:"number",default:"0",description:"Delay before animation starts (seconds)"},{name:"ease",type:"Easing | Easing[]",default:"'easeOut'",description:"Easing function: string name, cubic-bezier [n,n,n,n], or custom function"},{name:"repeat",type:"number",default:"0",description:"Number of times to repeat the animation"},{name:"direction",type:"'normal' | 'reverse' | 'alternate' | 'alternate-reverse'",default:"'normal'",description:"Animation playback direction"},{name:"endDelay",type:"number",default:"0",description:"Delay after animation completes (seconds)"},{name:"type",type:"'tween' | 'spring' | 'inertia'",default:"'tween'",description:"Animation type"},{name:"stiffness",type:"number",default:"-",description:"Spring stiffness (spring type only)"},{name:"damping",type:"number",default:"-",description:"Spring damping (spring type only)"},{name:"mass",type:"number",default:"-",description:"Spring mass (spring type only)"},{name:"bounce",type:"number",default:"-",description:"Duration-based spring bounce (spring type only)"},{name:"once",type:"boolean",default:"false",description:"Only animate once when using scroll trigger"},{name:"margin",type:"string",default:"-",description:"IntersectionObserver rootMargin for scroll trigger"},{name:"amount",type:"number | 'some' | 'all'",default:"-",description:"How much of the element must be visible to trigger (scroll)"}];hoverOptionsDocs=[{name:"passive",type:"boolean",default:"-",description:"Use passive event listener for hover events"},{name:"once",type:"boolean",default:"-",description:"Only trigger hover animation once"}];scrollInfoDocs=[{name:"x.current",type:"number",description:"Current horizontal scroll position in pixels from the left edge of the scrollable container."},{name:"x.scrollLength",type:"number",description:"Total horizontal scrollable distance in pixels (scrollWidth minus clientWidth)."},{name:"x.velocity",type:"number",description:"Current horizontal scroll velocity in pixels per second. Positive values indicate rightward scrolling."},{name:"y.current",type:"number",description:"Current vertical scroll position in pixels from the top of the scrollable container."},{name:"y.scrollLength",type:"number",description:"Total vertical scrollable distance in pixels (scrollHeight minus clientHeight)."},{name:"y.velocity",type:"number",description:"Current vertical scroll velocity in pixels per second. Positive values indicate downward scrolling."}];typeAnimationPreset=`type AnimationPreset =
  | 'fadeIn'     | 'fadeOut'
  | 'fadeInUp'   | 'fadeInDown'
  | 'fadeInLeft' | 'fadeInRight'
  | 'zoomIn'     | 'zoomOut'
  | 'slideInUp'  | 'slideInDown'
  | 'bounceIn'   | 'rotateIn';`;typeHoverKeyframes=`type HoverKeyframes = Record<string, [start: number | string, end: number | string]>;

// Example:
// { scale: [1, 1.1], y: [0, -4], boxShadow: ['0 4px 6px rgba(0,0,0,0.1)', '0 20px 25px rgba(0,0,0,0.15)'] }`;typeEasing=`type Easing =
  | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'circIn' | 'circOut' | 'circInOut'
  | 'backIn' | 'backOut' | 'backInOut'
  | [number, number, number, number]   // cubic-bezier
  | ((t: number) => number);            // custom function`;static \u0275fac=function(o){return new(o||t)};static \u0275cmp=k({type:t,selectors:[["app-motion-demo"]],decls:26,vars:21,consts:[["title","Motion Directives","description","Declarative animations powered by Motion.dev with scroll, hover, and click triggers","icon","Sparkles","category","Utilities","importName","MotionAnimateDirective"],["examples",""],["role","tablist",1,"tabs","tabs-box","tabs-boxed"],["role","tab",1,"tab",3,"click"],[1,"space-y-6"],["api",""],["title","Animate on Load","description","Elements animate when they appear",3,"codeExample"],[1,"btn","btn-primary","mb-4",3,"click"],[1,"grid","grid-cols-2","md:grid-cols-4","gap-4"],["title","Click Animations","description","Triggered by user click",3,"codeExample"],[1,"flex","flex-wrap","gap-4"],[1,"btn","btn-primary",3,"motionAnimate","motionOptions"],[1,"btn","btn-secondary",3,"motionAnimate","motionOptions"],[1,"btn","btn-accent",3,"motionAnimate","motionOptions"],["name","RefreshCw",3,"size"],[1,"btn","btn-warning",3,"motionAnimate","motionOptions"],["title","Staggered Animation","description","Elements animate in sequence with delays",3,"codeExample"],[1,"space-y-2"],[1,"p-6","bg-primary","text-primary-content","rounded-lg","text-center",3,"motionAnimate","motionOptions"],[1,"p-6","bg-secondary","text-secondary-content","rounded-lg","text-center",3,"motionAnimate","motionOptions"],[1,"p-6","bg-accent","text-accent-content","rounded-lg","text-center",3,"motionAnimate","motionOptions"],[1,"p-6","bg-info","text-info-content","rounded-lg","text-center",3,"motionAnimate","motionOptions"],[1,"p-4","bg-base-200","rounded-lg","flex","items-center","gap-3",3,"motionAnimate","motionOptions"],[1,"text-primary",3,"name","size"],["title","Basic Hover Effects","description","Interactive hover effects",3,"codeExample"],[1,"grid","grid-cols-2","md:grid-cols-4","gap-6"],[1,"p-6","bg-primary","text-primary-content","rounded-lg","text-center","cursor-pointer",3,"motionHover","animationOptions"],[1,"p-6","bg-secondary","text-secondary-content","rounded-lg","text-center","cursor-pointer",3,"motionHover","animationOptions"],[1,"p-6","bg-accent","text-accent-content","rounded-lg","text-center","cursor-pointer",3,"motionHover","animationOptions"],[1,"p-6","bg-info","text-info-content","rounded-lg","text-center","cursor-pointer",3,"motionHover","animationOptions"],["title","Combined Hover Effects","description","Multiple properties animated together",3,"codeExample"],[1,"grid","grid-cols-1","md:grid-cols-3","gap-6"],[1,"p-6","bg-base-200","rounded-xl","shadow-md","cursor-pointer",3,"motionHover","animationOptions"],["name","Rocket",1,"text-primary","mb-3",3,"size"],[1,"font-semibold"],[1,"text-sm","text-base-content/70","mt-1"],[1,"p-6","bg-gradient-to-br","from-primary/20","to-secondary/20","rounded-xl","cursor-pointer",3,"motionHover","animationOptions"],["name","Sparkles",1,"text-secondary","mb-3",3,"size"],[1,"p-6","bg-base-200","rounded-xl","cursor-pointer","border-l-4","border-accent",3,"motionHover","animationOptions"],["name","ArrowRight",1,"text-accent","mb-3",3,"size"],["title","Animation Presets","description","Built-in named animations (click to trigger)",3,"codeExample"],[1,"grid","grid-cols-2","md:grid-cols-4","lg:grid-cols-6","gap-4"],[1,"btn","btn-outline","btn-sm",3,"motionAnimate","motionOptions"],["title","Custom Keyframes","description","Define your own animation keyframes",3,"codeExample"],[1,"flex","flex-wrap","gap-6"],[1,"p-6","bg-gradient-to-r","from-primary","to-secondary","text-white","rounded-xl",3,"motionAnimate","motionOptions"],[1,"p-6","bg-gradient-to-r","from-secondary","to-accent","text-white","rounded-xl",3,"motionAnimate","motionOptions"],["title","MotionAnimateDirective Inputs",3,"entries"],["title","Public Methods",3,"entries"],[1,"card","card-border","card-bordered","bg-base-100"],[1,"card-body","gap-3"],[1,"card-title","text-lg"],[1,"text-sm","text-base-content/70"],[3,"code"],["title","MotionHoverDirective Inputs",3,"entries"],["title","Outputs",3,"entries"],["title","HoverOptions",3,"entries"],["title","MotionScrollDirective Inputs",3,"entries"],["title","ScrollInfo Properties",3,"entries"],["title","MotionDirectiveOptions (shared across all directives)",3,"entries"]],template:function(o,m){o&1&&(n(0,"app-demo-page",0)(1,"div",1)(2,"div",2)(3,"button",3),g("click",function(){return m.activeTab.set("animate")}),a(4,"Animate"),i(),n(5,"button",3),g("click",function(){return m.activeTab.set("hover")}),a(6,"Hover"),i(),n(7,"button",3),g("click",function(){return m.activeTab.set("presets")}),a(8,"Presets"),i()(),v(9,Oe,20,31,"div",4),v(10,Ee,31,57,"div",4),v(11,Ae,11,21,"div",4),i(),n(12,"div",5)(13,"div",2)(14,"button",3),g("click",function(){return m.apiTab.set("animate-directive")}),a(15," Animate Directive "),i(),n(16,"button",3),g("click",function(){return m.apiTab.set("hover-directive")}),a(17," Hover Directive "),i(),n(18,"button",3),g("click",function(){return m.apiTab.set("scroll-directive")}),a(19," Scroll Directive "),i(),n(20,"button",3),g("click",function(){return m.apiTab.set("options-types")}),a(21," Options & Types "),i()(),v(22,Ie,23,4,"div",4),v(23,Te,5,4,"div",4),v(24,ke,5,4,"div",4),v(25,Me,35,4,"div",4),i()()),o&2&&(e(3),b("tab-active",m.activeTab()==="animate"),e(2),b("tab-active",m.activeTab()==="hover"),e(2),b("tab-active",m.activeTab()==="presets"),e(2),y(m.activeTab()==="animate"?9:-1),e(),y(m.activeTab()==="hover"?10:-1),e(),y(m.activeTab()==="presets"?11:-1),e(3),b("tab-active",m.apiTab()==="animate-directive"),e(2),b("tab-active",m.apiTab()==="hover-directive"),e(2),b("tab-active",m.apiTab()==="scroll-directive"),e(2),b("tab-active",m.apiTab()==="options-types"),e(2),y(m.apiTab()==="animate-directive"?22:-1),e(),y(m.apiTab()==="hover-directive"?23:-1),e(),y(m.apiTab()==="scroll-directive"?24:-1),e(),y(m.apiTab()==="options-types"?25:-1))},dependencies:[H,P,F,R,z,K,L],encapsulation:2})};export{V as MotionDemoComponent};

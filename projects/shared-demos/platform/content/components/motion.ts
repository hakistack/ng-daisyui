import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'Five attribute directives add animation to any element: fade a card in when it appears, lift it on hover, shrink a button while it is pressed, tie a progress bar to page scroll, or react when an element changes size. They wrap the `motion` library (the vanilla version of Framer Motion), which ships with the package.',
      es: 'Cinco directivas de atributo añaden animación a cualquier elemento: hacer aparecer una tarjeta con un fundido, elevarla con el hover, encoger un botón mientras se presiona, atar una barra de progreso al scroll de la página o reaccionar cuando un elemento cambia de tamaño. Envuelven la librería `motion` (la versión vanilla de Framer Motion), que viene con el paquete.',
    },
    {
      en: 'You describe the end state as keyframes (`{ opacity: [0, 1], y: [20, 0] }`) or pick a preset name (`fadeInUp`). The directives clean up after themselves when the element is destroyed and step aside when the user asks the system for reduced motion.',
      es: 'Describes el estado final como keyframes (`{ opacity: [0, 1], y: [20, 0] }`) o escoges un preset por nombre (`fadeInUp`). Las directivas se limpian solas cuando el elemento se destruye y se hacen a un lado cuando el usuario le pide al sistema reducir el movimiento.',
    },
  ],
  whenToUse: [
    {
      en: 'Entrance animations that help the eye follow new content: a list that loads, a section that scrolls into view.',
      es: 'Animaciones de entrada que ayudan a la vista a seguir contenido nuevo: una lista que carga, una sección que entra en pantalla con el scroll.',
    },
    {
      en: 'Small feedback on interactive elements: lift on hover, shrink on press.',
      es: 'Pequeña respuesta en elementos interactivos: elevar con el hover, encoger al presionar.',
    },
    {
      en: 'Scroll-linked effects such as a reading-progress bar, or reading scroll progress as a number.',
      es: 'Efectos atados al scroll como una barra de progreso de lectura, o leer el progreso del scroll como un número.',
    },
    {
      en: 'Knowing an element’s size as it changes (`hkResize`), for layouts that depend on the space a component really has.',
      es: 'Saber el tamaño de un elemento a medida que cambia (`hkResize`), para diseños que dependen del espacio real de un componente.',
    },
  ],
  whenNotToUse: [
    {
      en: 'To carry meaning or trigger logic. `hkHover` reacts to the mouse only (not to touch or keyboard focus), so put actions on `(click)` and state in your own code; the outputs are for extra feedback.',
      es: 'Para comunicar significado o disparar lógica. `hkHover` solo responde al mouse (no al toque ni al foco del teclado), así que pon las acciones en `(click)` y el estado en tu propio código; las salidas sirven para dar información adicional.',
    },
    {
      en: 'Simple color or opacity transitions on hover or focus: a Tailwind `transition` class is lighter and also works on keyboard focus.',
      es: 'Transiciones simples de color u opacidad en hover o foco: una clase `transition` de Tailwind es más liviana y también funciona con el foco del teclado.',
    },
    {
      en: 'Library components: toasts, notifications, the select dropdown and the wizard already animate themselves with CSS.',
      es: 'Componentes de la librería: los toasts, las notificaciones, el desplegable del select y el wizard ya se animan solos con CSS.',
    },
    {
      en: 'Long or looping animations on content people need to read.',
      es: 'Animaciones largas o en bucle sobre contenido que la gente necesita leer.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MotionAnimateDirective,
  type MotionDirectiveOptions,
  MotionHoverDirective,
  MotionPressDirective,
  MotionScrollDirective,
} from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-feature-list',
  imports: [MotionAnimateDirective, MotionHoverDirective, MotionPressDirective, MotionScrollDirective],
  template: \`
    <!-- Reading-progress bar linked to page scroll -->
    <div class="bg-primary fixed inset-x-0 top-0 z-50 h-1 origin-left" [hkScroll]="{ scaleX: [0, 1] }"></div>

    <h2 class="text-2xl font-semibold" hkAnimate="fadeInUp">Features</h2>

    <!-- Children fade in one after another when the list scrolls into view -->
    <ul class="grid gap-4 md:grid-cols-3" hkAnimate="fadeInUp" [hkAnimateOptions]="listAnimation">
      @for (feature of features; track feature) {
        <li class="card bg-base-100 border-base-300 border p-4" [hkHover]="{ y: -4 }">{{ feature }}</li>
      }
    </ul>

    <button type="button" class="btn btn-primary" [hkPress]="{ scale: 0.95 }" (click)="start()">Get started</button>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureListComponent {
  readonly features = ['Fast setup', 'Typed config', 'Accessible'];

  readonly listAnimation: MotionDirectiveOptions = {
    trigger: 'scroll',
    once: true,
    amount: 0.3,
    stagger: 0.08,
    staggerSelector: 'li',
  };

  start(): void {
    console.log('start');
  }
}
`,
    note: {
      en: 'No provider is needed. The button’s action lives on its own `(click)`; `hkPress` only adds feedback, so the button behaves the same with or without the animation (for example under reduced motion).',
      es: 'No hace falta provider. La acción del botón está en su propio `(click)`; `hkPress` solo agrega una respuesta visual, así que el botón se comporta igual con o sin la animación (por ejemplo, con movimiento reducido).',
    },
  },
  technical: [
    {
      id: 'directives',
      heading: { en: 'The directives at a glance', es: 'Las directivas de un vistazo' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Directive', es: 'Directiva' },
            { en: 'Selector / main input', es: 'Selector / input principal' },
            { en: 'Outputs and methods', es: 'Salidas y métodos' },
          ],
          rows: [
            [
              { en: '[MotionAnimateDirective](/api/MotionAnimateDirective)', es: '[MotionAnimateDirective](/api/MotionAnimateDirective)' },
              {
                en: '`hkAnimate`: preset name or keyframes (default `fadeIn`); `hkAnimateOptions`',
                es: '`hkAnimate`: nombre de preset o keyframes (por defecto `fadeIn`); `hkAnimateOptions`',
              },
              { en: '`play()`, `stop()`, `reset()`', es: '`play()`, `stop()`, `reset()`' },
            ],
            [
              { en: '[MotionHoverDirective](/api/MotionHoverDirective)', es: '[MotionHoverDirective](/api/MotionHoverDirective)' },
              {
                en: '`[hkHover]` keyframes (required); `animationOptions`, `restoreOnLeave`, `customRestoreKeyframes`, `hoverOptions`',
                es: '`[hkHover]` keyframes (obligatorio); `animationOptions`, `restoreOnLeave`, `customRestoreKeyframes`, `hoverOptions`',
              },
              {
                en: '`hoverStart`, `hoverEnd`; `triggerHover()`, `triggerRestore()`, `stop()`',
                es: '`hoverStart`, `hoverEnd`; `triggerHover()`, `triggerRestore()`, `stop()`',
              },
            ],
            [
              { en: '[MotionPressDirective](/api/MotionPressDirective)', es: '[MotionPressDirective](/api/MotionPressDirective)' },
              {
                en: '`[hkPress]` keyframes (required); `animationOptions`, `restoreOnRelease`, `customRestoreKeyframes`, `pressOptions`',
                es: '`[hkPress]` keyframes (obligatorio); `animationOptions`, `restoreOnRelease`, `customRestoreKeyframes`, `pressOptions`',
              },
              {
                en: '`pressStart`, `pressEnd` (`{ event, success }`); `stop()`',
                es: '`pressStart`, `pressEnd` (`{ event, success }`); `stop()`',
              },
            ],
            [
              { en: '[MotionScrollDirective](/api/MotionScrollDirective)', es: '[MotionScrollDirective](/api/MotionScrollDirective)' },
              {
                en: '`[hkScroll]`: keyframes (scroll-linked) or `true` (progress only); `scrollContainer`, `scrollTarget`, `scrollAxis`, `scrollOffset`',
                es: '`[hkScroll]`: keyframes (atado al scroll) o `true` (solo progreso); `scrollContainer`, `scrollTarget`, `scrollAxis`, `scrollOffset`',
              },
              {
                en: '`scrollProgress` (0–1), `scrollInfo`; `stop()`, `restart()`',
                es: '`scrollProgress` (0–1), `scrollInfo`; `stop()`, `restart()`',
              },
            ],
            [
              { en: '[MotionResizeDirective](/api/MotionResizeDirective)', es: '[MotionResizeDirective](/api/MotionResizeDirective)' },
              {
                en: "`[hkResize]`: `'viewport'` for the window, anything else for the host element",
                es: "`[hkResize]`: `'viewport'` para la ventana, cualquier otro valor para el elemento host",
              },
              {
                en: '`resizeChange` (`{ width, height }`); `stop()`, `restart()`',
                es: '`resizeChange` (`{ width, height }`); `stop()`, `restart()`',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Changing an input re-creates the animation or listener, so keep option objects in class fields rather than building new ones from changing values on every render.',
            es: 'Cambiar un input vuelve a crear la animación o el listener, así que guarda los objetos de opciones en campos de la clase en lugar de construir nuevos a partir de valores que cambian en cada render.',
          },
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'Bare attributes compile under strict templates: `<div hkAnimate>` plays the default `fadeIn` preset and `<div hkResize>` observes the host. A bare `<div hkScroll>` turns on progress tracking (same as `[hkScroll]="true"`), so `<div hkScroll (scrollProgress)="…">` works without a value; pass keyframes for a scroll-linked animation.',
            es: 'Los atributos sin valor compilan con plantillas estrictas: `<div hkAnimate>` reproduce el preset `fadeIn` por defecto y `<div hkResize>` observa el host. Un `<div hkScroll>` sin valor activa el seguimiento del progreso (igual que `[hkScroll]="true"`), así que `<div hkScroll (scrollProgress)="…">` funciona sin valor; pasa keyframes para una animación ligada al scroll.',
          },
        },
      ],
    },
    {
      id: 'animate',
      heading: { en: 'hkAnimate: presets, triggers and stagger', es: 'hkAnimate: presets, disparadores y escalonado' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Presets ([AnimationPreset](/api/AnimationPreset)): `fadeIn`, `fadeOut`, `fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight` (20px offset), `zoomIn`, `zoomOut` (scale 0.8), `slideInUp`, `slideInDown` (100%), `bounceIn`, `rotateIn`. Anything else is a keyframes object in Motion’s format.',
            es: 'Presets ([AnimationPreset](/api/AnimationPreset)): `fadeIn`, `fadeOut`, `fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight` (desplazamiento de 20px), `zoomIn`, `zoomOut` (escala 0.8), `slideInUp`, `slideInDown` (100%), `bounceIn`, `rotateIn`. Cualquier otra cosa es un objeto de keyframes en el formato de Motion.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Option', es: 'Opción' },
            { en: 'Meaning', es: 'Significado' },
          ],
          rows: [
            [
              { en: '`trigger`', es: '`trigger`' },
              {
                en: '`immediate` (default) plays on init; `scroll` plays when the element enters the viewport; `click` plays on every click of the host',
                es: '`immediate` (por defecto) se reproduce al iniciar; `scroll` cuando el elemento entra al viewport; `click` en cada clic sobre el host',
              },
            ],
            [
              { en: '`once`, `amount`, `margin`', es: '`once`, `amount`, `margin`' },
              {
                en: 'Scroll trigger only: play the first time only; how much must be visible (0–1, `some`, `all`); viewport margin',
                es: 'Solo con disparador scroll: reproducir solo la primera vez; cuánto debe verse (0–1, `some`, `all`); margen del viewport',
              },
            ],
            [
              { en: '`duration`, `delay`, `ease`', es: '`duration`, `delay`, `ease`' },
              {
                en: "Seconds; defaults `0.6` and `easeOut`. Spring options (`type: 'spring'`, `stiffness`, `damping`, `bounce`…) are also accepted",
                es: "En segundos; por defecto `0.6` y `easeOut`. También acepta opciones de resorte (`type: 'spring'`, `stiffness`, `damping`, `bounce`…)",
              },
            ],
            [
              { en: '`stagger`, `staggerSelector`', es: '`stagger`, `staggerSelector`' },
              {
                en: 'Animate the children instead of the host, each one later than the previous. A number is the step in seconds; [MotionStaggerConfig](/api/MotionStaggerConfig) adds `startDelay`, `from` and `ease`. Default selector: direct children',
                es: 'Anima a los hijos en lugar del host, cada uno después del anterior. Un número es el paso en segundos; [MotionStaggerConfig](/api/MotionStaggerConfig) añade `startDelay`, `from` y `ease`. Selector por defecto: hijos directos',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Elements are visible in their normal state until the animation starts; at that moment they jump to the first keyframe. With the `scroll` trigger this happens as they enter the viewport, which is usually unnoticeable. `stagger` reads the children when the animation plays, so items added later are not included until it plays again.',
            es: 'Los elementos se ven en su estado normal hasta que empieza la animación; en ese momento saltan al primer keyframe. Con el disparador `scroll` esto pasa cuando entran al viewport, lo que normalmente no se nota. `stagger` lee los hijos cuando la animación se reproduce, así que los ítems que se añadan después no se incluyen hasta que se vuelva a reproducir.',
          },
        },
      ],
    },
    {
      id: 'hover-press',
      heading: { en: 'hkHover and hkPress', es: 'hkHover y hkPress' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Both animate **to** your keyframes when the gesture starts and back to the element’s starting values when it ends. Starting values are read once when the directive sets up (transforms assume `0` / scale `1`; `opacity`, `backgroundColor` and other properties come from the computed style). If the element’s resting style changes later, pass `customRestoreKeyframes`.',
            es: 'Ambas animan **hacia** tus keyframes cuando empieza el gesto y de vuelta a los valores iniciales del elemento cuando termina. Los valores iniciales se leen una vez al configurar la directiva (las transformaciones asumen `0` / escala `1`; `opacity`, `backgroundColor` y otras propiedades salen del estilo calculado). Si el estilo en reposo del elemento cambia después, pasa `customRestoreKeyframes`.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: '`hkHover`: default `0.3s` `easeOut`; the return takes 80% of that. Touch pointers are ignored, so it never fires on phones.',
              es: '`hkHover`: por defecto `0.3s` `easeOut`; el regreso toma el 80% de eso. Ignora los punteros táctiles, así que nunca se activa en teléfonos.',
            },
            {
              en: '`hkPress`: default `0.15s` `easeOut`; the release takes 60% of that. It filters out right-clicks and extra fingers, and `pressEnd.success` is `false` when the pointer was dragged off before release.',
              es: '`hkPress`: por defecto `0.15s` `easeOut`; la liberación toma el 60% de eso. Filtra clics derechos y dedos adicionales, y `pressEnd.success` es `false` cuando el puntero se arrastró fuera antes de soltar.',
            },
          ],
        },
      ],
    },
    {
      id: 'scroll-resize',
      heading: { en: 'hkScroll and hkResize', es: 'hkScroll y hkResize' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "With keyframes, `hkScroll` creates a paused animation and scrubs it with scroll position (linear by default). With `true`, it only emits `scrollProgress` and `scrollInfo` on every scroll event. By default it tracks the page; pass `scrollContainer` for a scrolling element and `scrollTarget` plus `scrollOffset` (for example `['start end', 'end start']`) to measure progress across one element.",
            es: "Con keyframes, `hkScroll` crea una animación en pausa y la mueve según la posición del scroll (lineal por defecto). Con `true`, solo emite `scrollProgress` y `scrollInfo` en cada evento de scroll. Por defecto sigue la página; pasa `scrollContainer` para un elemento con scroll, y `scrollTarget` más `scrollOffset` (por ejemplo `['start end', 'end start']`) para medir el progreso a lo largo de un elemento.",
          },
        },
        {
          kind: 'p',
          text: {
            en: "`hkResize` emits `{ width, height }` in CSS pixels, from a `ResizeObserver` on the host or from window resizes with `'viewport'`. It is not an animation, so reduced motion does not affect it.",
            es: "`hkResize` emite `{ width, height }` en píxeles CSS, desde un `ResizeObserver` sobre el host o desde los cambios de tamaño de la ventana con `'viewport'`. No es una animación, así que el movimiento reducido no lo afecta.",
          },
        },
      ],
    },
    {
      id: 'sequence',
      heading: { en: 'Sequences across elements', es: 'Secuencias entre elementos' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "[animateSequence](/api/animateSequence) plays a timeline over several targets and returns Motion’s playback controls. Each segment’s `at` places it relative to the previous one (`'<0.2'`, `'+0.1'`). Like the directives, it honors reduced motion: with `prefers-reduced-motion: reduce` every segment jumps to its final state at once (no duration, delay or repeat).",
            es: "[animateSequence](/api/animateSequence) reproduce una línea de tiempo sobre varios elementos y devuelve los controles de reproducción de Motion. El `at` de cada segmento lo ubica respecto al anterior (`'<0.2'`, `'+0.1'`). Igual que las directivas, respeta el movimiento reducido: con `prefers-reduced-motion: reduce` cada segmento salta de inmediato a su estado final (sin duración, retraso ni repeticiones).",
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'hero.component.ts',
          code: `import { afterNextRender, Component } from '@angular/core';
import { animateSequence } from '@hakistack/ng-daisyui';

@Component({ /* … */ })
export class HeroComponent {
  constructor() {
    afterNextRender(() => {
      // Under reduced motion every segment jumps straight to its final state.
      animateSequence([
        { target: '.hero-title', keyframes: { opacity: [0, 1], y: [16, 0] }, options: { duration: 0.5 } },
        { target: '.hero-subtitle', keyframes: { opacity: [0, 1] }, options: { at: '<0.2' } },
        { target: '.hero-cta', keyframes: { scale: [0.9, 1], opacity: [0, 1] }, options: { at: '+0.1' } },
      ]);
    });
  }
}`,
        },
      ],
    },
    {
      id: 'reduced-motion',
      heading: { en: 'Reduced motion in detail', es: 'Movimiento reducido en detalle' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Directive', es: 'Directiva' },
            { en: 'With `prefers-reduced-motion: reduce`', es: 'Con `prefers-reduced-motion: reduce`' },
          ],
          rows: [
            [
              { en: '`hkAnimate`', es: '`hkAnimate`' },
              {
                en: 'No animation. Only the final `opacity` keyframe is applied to the host, instantly; transforms are not applied, so the element stays in its normal position. Checked every time it plays.',
                es: 'Sin animación. Solo se aplica al host el keyframe final de `opacity`, al instante; las transformaciones no se aplican, así que el elemento queda en su posición normal. Se revisa cada vez que se reproduce.',
              },
            ],
            [
              { en: '`hkHover`, `hkPress`', es: '`hkHover`, `hkPress`' },
              {
                en: 'No animation, but the gesture is still tracked: `hoverStart` / `hoverEnd` and `pressStart` / `pressEnd` keep firing. Checked when the directive sets up.',
                es: 'Sin animación, pero el gesto se sigue detectando: `hoverStart` / `hoverEnd` y `pressStart` / `pressEnd` siguen emitiendo. Se revisa cuando la directiva se configura.',
              },
            ],
            [
              { en: '`hkScroll`', es: '`hkScroll`' },
              {
                en: 'With keyframes, no scroll-linked animation. With `true` (progress only), `scrollProgress` and `scrollInfo` keep firing, since they only report values. Checked when the directive sets up.',
                es: 'Con keyframes, no hay animación ligada al scroll. Con `true` (solo progreso), `scrollProgress` y `scrollInfo` siguen emitiendo, porque solo reportan valores. Se revisa cuando la directiva se configura.',
              },
            ],
            [
              { en: '`hkResize`', es: '`hkResize`' },
              { en: 'Unchanged.', es: 'Sin cambios.' },
            ],
            [
              { en: '`animateSequence`', es: '`animateSequence`' },
              {
                en: 'No animation: every segment is applied instantly in its final state (duration and delay 0, no repeat). Checked each time you call it.',
                es: 'Sin animación: cada segmento se aplica al instante en su estado final (duración y retraso 0, sin repeticiones). Se revisa cada vez que la llamas.',
              },
            ],
          ],
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Do not pre-hide staggered children with CSS (`opacity-0`). Under reduced motion only the host’s opacity is set, so the children would stay invisible.',
              es: 'No ocultes de antemano con CSS (`opacity-0`) a los hijos escalonados. Con movimiento reducido solo se ajusta la opacidad del host, así que los hijos quedarían invisibles.',
            },
            {
              en: 'Custom keyframes whose final state is not the element’s natural one (for example `{ x: [0, 120] }`) do not reach that state under reduced motion. Use animation for the transition, not to place things.',
              es: 'Los keyframes propios cuyo estado final no es el natural del elemento (por ejemplo `{ x: [0, 120] }`) no llegan a ese estado con movimiento reducido. Usa la animación para la transición, no para ubicar cosas.',
            },
            {
              en: 'If the user changes the setting while the page is open, `hkHover`, `hkPress` and `hkScroll` pick it up only when they set up again (an input change or a new element).',
              es: 'Si el usuario cambia el ajuste con la página abierta, `hkHover`, `hkPress` y `hkScroll` lo toman en cuenta solo cuando se vuelven a configurar (un cambio de input o un elemento nuevo).',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Enter',
        action: {
          en: 'On a focused element with `hkPress`, plays the press animation (keyboard press support comes from Motion)',
          es: 'En un elemento enfocado con `hkPress`, reproduce la animación de presión (el soporte de teclado viene de Motion)',
        },
      },
      {
        keys: 'Enter / Space',
        action: {
          en: "On a button with `hkAnimate` and `trigger: 'click'`, plays the animation, because the browser fires `click`",
          es: "En un botón con `hkAnimate` y `trigger: 'click'`, reproduce la animación, porque el navegador dispara `click`",
        },
      },
    ],
    notes: [
      {
        en: 'All directives honor `prefers-reduced-motion`, with the details above. Test your pages with the setting on: content must be complete and usable without any animation.',
        es: 'Todas las directivas respetan `prefers-reduced-motion`, con los detalles de arriba. Prueba tus páginas con el ajuste activado: el contenido debe estar completo y ser usable sin ninguna animación.',
      },
      {
        en: '`hkHover` responds to the mouse only, not to keyboard focus. Do not hide information or actions behind it; add `focus-visible:` styles for keyboard users.',
        es: '`hkHover` responde solo al mouse, no al foco del teclado. No escondas información ni acciones detrás de él; añade estilos `focus-visible:` para quienes usan teclado.',
      },
      {
        en: '`hkPress` makes a host that is not natively focusable (a `div`, a `li`) focusable by adding `tabindex="0"`. Put it on real buttons and links so the element also has the right role and name.',
        es: '`hkPress` vuelve enfocable un host que no lo es de forma nativa (un `div`, un `li`) añadiéndole `tabindex="0"`. Ponlo en botones y enlaces reales para que el elemento también tenga el rol y el nombre correctos.',
      },
      {
        en: 'Keep animations short and avoid large movements or repeated loops; motion of more than a few seconds that the user cannot pause conflicts with WCAG 2.2.2.',
        es: 'Mantén las animaciones cortas y evita movimientos grandes o bucles repetidos; un movimiento de más de unos segundos que el usuario no puede pausar choca con WCAG 2.2.2.',
      },
    ],
  },
  performance: [
    {
      en: 'Animate `opacity` and transforms (`x`, `y`, `scale`, `rotate`). Animating `width`, `height`, `top` or `left` forces layout on every frame.',
      es: 'Anima `opacity` y transformaciones (`x`, `y`, `scale`, `rotate`). Animar `width`, `height`, `top` o `left` obliga a recalcular el diseño en cada frame.',
    },
    {
      en: '`hkScroll` in progress mode emits on every scroll event; write the value to a signal and keep handlers cheap. Prefer keyframes mode when you only need a visual effect.',
      es: '`hkScroll` en modo progreso emite en cada evento de scroll; guarda el valor en una señal y mantén los handlers livianos. Prefiere el modo keyframes cuando solo necesitas un efecto visual.',
    },
    {
      en: 'Hundreds of `hkHover` or `hkAnimate` instances in a long list each set up listeners and observers. Use `stagger` on the list container instead of one directive per item, and do not animate rows inside virtualized tables or grids.',
      es: 'Cientos de instancias de `hkHover` o `hkAnimate` en una lista larga configuran cada una sus listeners y observadores. Usa `stagger` en el contenedor de la lista en lugar de una directiva por ítem, y no animes filas dentro de tablas o grids virtualizados.',
    },
    {
      en: 'Every directive stops its animation and removes its listeners and observers when the element is destroyed.',
      es: 'Cada directiva detiene su animación y quita sus listeners y observadores cuando el elemento se destruye.',
    },
  ],
  related: [
    {
      id: 'accessibility',
      note: { en: 'Reduced motion across the library.', es: 'Movimiento reducido en toda la librería.' },
    },
    { id: 'responsive', note: { en: 'Hover and press on touch screens.', es: 'Hover y press en pantallas táctiles.' } },
    { id: 'directives', note: { en: 'Auto-focus and input masks.', es: 'Autofoco y máscaras de entrada.' } },
  ],
};

export default content;

import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'Tabs let the user switch between related panels of content without leaving the page — Profile, Security, Billing — while only one panel is visible at a time.',
      es: 'Las pestañas permiten cambiar entre paneles de contenido relacionados sin salir de la página — Perfil, Seguridad, Facturación — mostrando un solo panel a la vez.',
    },
    {
      en: 'You write one `hk-tab-group` and, inside it, one `hk-tab-panel` per tab with a `value`, a `label` and its content wrapped in `<ng-template>`. The group draws the tab buttons with DaisyUI styles (`lift`, `box` or `border`, or a vertical layout) and only creates the content of the selected panel.',
      es: 'Escribes un `hk-tab-group` y, dentro, un `hk-tab-panel` por pestaña con un `value`, un `label` y su contenido envuelto en `<ng-template>`. El grupo dibuja los botones con estilos de DaisyUI (`lift`, `box` o `border`, o un diseño vertical) y solo crea el contenido del panel seleccionado.',
    },
    {
      en: "Keyboard support and ARIA come from `@angular/aria/tabs`, Angular's headless accessibility primitives, so arrow keys, Home/End and the tab/tabpanel roles behave the standard way.",
      es: 'El soporte de teclado y ARIA viene de `@angular/aria/tabs`, las primitivas de accesibilidad sin estilos de Angular, así que las flechas, Home/End y los roles tab/tabpanel funcionan de la forma estándar.',
    },
  ],
  whenToUse: [
    {
      en: 'Several views of the same object where the user looks at one at a time (settings sections, record details).',
      es: 'Varias vistas del mismo objeto donde el usuario mira una a la vez (secciones de ajustes, detalles de un registro).',
    },
    {
      en: 'Heavy content that should not be created until it is opened — only the active panel is rendered.',
      es: 'Contenido pesado que no debe crearse hasta que se abra: solo se renderiza el panel activo.',
    },
    {
      en: 'A settings page with a side list of sections: use `orientation="vertical"`.',
      es: 'Una página de ajustes con una lista lateral de secciones: usa `orientation="vertical"`.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Navigating between routes or pages: tabs are not router-aware; use [Menu](/menu) or router links.',
      es: 'Para navegar entre rutas o páginas: las pestañas no se integran con el router; usa [Menu](/menu) o enlaces del router.',
    },
    {
      en: 'Ordered steps with validation between them: use the [Wizard](/wizard).',
      es: 'Pasos ordenados con validación entre ellos: usa el [Wizard](/wizard).',
    },
    {
      en: 'Content the user must compare side by side: tabs hide everything but one panel.',
      es: 'Contenido que el usuario debe comparar lado a lado: las pestañas ocultan todo menos un panel.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-account-tabs',
  imports: [TabGroupComponent, TabPanelComponent],
  template: \`
    <hk-tab-group [(selectedTab)]="activeTab" variant="box">
      <hk-tab-panel value="profile" label="Profile">
        <ng-template>Profile settings go here.</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="security" label="Security">
        <ng-template>Password and two-factor options.</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="billing" label="Billing" [disabled]="true">
        <ng-template>Billing is not available yet.</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
    <p class="mt-2 text-sm">Active tab: {{ activeTab() }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTabsComponent {
  readonly activeTab = signal<string | undefined>('profile');
}
`,
    note: {
      en: "No providers are needed. Each panel's content must be inside an `<ng-template>`; the panel requires it.",
      es: 'No hace falta ningún provider. El contenido de cada panel debe ir dentro de un `<ng-template>`; el panel lo exige.',
    },
  },
  technical: [
    {
      id: 'aria-tabs',
      heading: { en: 'Built on @angular/aria', es: 'Construido sobre @angular/aria' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The group template applies the `ngTabs`, `ngTabList`, `ngTab`, `ngTabPanel` and `ngTabContent` directives from `@angular/aria/tabs`. They manage the roving tabindex, `aria-selected`, `aria-controls`, `aria-labelledby` and `inert` on hidden panels; the library adds DaisyUI classes on top.',
            es: 'El template del grupo usa las directivas `ngTabs`, `ngTabList`, `ngTab`, `ngTabPanel` y `ngTabContent` de `@angular/aria/tabs`. Ellas manejan el tabindex itinerante, `aria-selected`, `aria-controls`, `aria-labelledby` e `inert` en los paneles ocultos; la librería pone encima las clases de DaisyUI.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Input', es: 'Input' },
            { en: 'Default', es: 'Por defecto' },
            { en: 'Effect', es: 'Efecto' },
          ],
          rows: [
            [
              { en: '`selectionMode`', es: '`selectionMode`' },
              { en: "`'explicit'`", es: "`'explicit'`" },
              {
                en: "Arrows move focus; Enter/Space select. `'follow'` selects as focus moves.",
                es: "Las flechas mueven el foco; Enter/Space seleccionan. `'follow'` selecciona al mover el foco.",
              },
            ],
            [
              { en: '`orientation`', es: '`orientation`' },
              { en: "`'horizontal'`", es: "`'horizontal'`" },
              {
                en: 'Vertical switches arrows to Up/Down and renders a card with a side tab list.',
                es: 'Vertical cambia las flechas a Up/Down y dibuja una tarjeta con la lista de pestañas al lado.',
              },
            ],
            [
              { en: '`wrap`', es: '`wrap`' },
              { en: '`true`', es: '`true`' },
              { en: 'Arrow navigation wraps from last to first.', es: 'La navegación con flechas da la vuelta del último al primero.' },
            ],
            [
              { en: '`variant`', es: '`variant`' },
              { en: "`'lift'`", es: "`'lift'`" },
              {
                en: '`lift`, `box` or `border`; horizontal only, ignored in vertical mode.',
                es: '`lift`, `box` o `border`; solo horizontal, se ignora en modo vertical.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'lazy-content',
      heading: { en: 'Panel content is created lazily — and destroyed', es: 'El contenido se crea al abrirse — y se destruye' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "`ngTabContent` instantiates a panel's template only while that panel is visible. When the user switches away, the view is destroyed, because the library does not enable `preserveContent`.",
            es: '`ngTabContent` crea el template de un panel solo mientras ese panel está visible. Cuando el usuario cambia de pestaña, la vista se destruye, porque la librería no activa `preserveContent`.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: "State that lives inside a panel — unsaved input, scroll position, a child component's signals — is lost on every switch. Keep it in the parent component, a service, or a [form](/forms) controller created outside the tabs.",
            es: 'El estado que vive dentro de un panel — texto sin guardar, posición del scroll, señales de un componente hijo — se pierde en cada cambio. Guárdalo en el componente padre, en un servicio o en un controlador de [formulario](/forms) creado fuera de las pestañas.',
          },
        },
      ],
    },
    {
      id: 'selection',
      heading: { en: 'Selection state', es: 'Estado de selección' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '`selectedTab` is a two-way model holding the `value` of the active panel; set it from code to switch tabs.',
              es: '`selectedTab` es un modelo bidireccional con el `value` del panel activo; asígnalo desde el código para cambiar de pestaña.',
            },
            {
              en: '`activeIndex` is read once, after content init, and only when `selectedTab` is still undefined; it is clamped to the last panel.',
              es: '`activeIndex` se lee una sola vez, después de inicializar el contenido, y solo si `selectedTab` sigue sin definir; se limita al último panel.',
            },
            {
              en: "A `disabled` panel renders a disabled tab button. The panel's `icon` input is reserved and not rendered yet.",
              es: 'Un panel con `disabled` muestra su botón deshabilitado. El input `icon` del panel está reservado y todavía no se dibuja.',
            },
            {
              en: 'Card and tab classes come from the `HK_THEME` token, so the same markup works with the daisyUI v4 and v5 theme bridges.',
              es: 'Las clases de tarjeta y pestañas salen del token `HK_THEME`, así que el mismo HTML funciona con los puentes de tema de daisyUI v4 y v5.',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'ArrowLeft / ArrowRight',
        action: {
          en: 'Previous / next tab in horizontal mode (reversed in right-to-left)',
          es: 'Pestaña anterior / siguiente en modo horizontal (invertido en derecha a izquierda)',
        },
      },
      {
        keys: 'ArrowUp / ArrowDown',
        action: { en: 'Previous / next tab in vertical mode', es: 'Pestaña anterior / siguiente en modo vertical' },
      },
      { keys: 'Home / End', action: { en: 'First / last tab', es: 'Primera / última pestaña' } },
      {
        keys: 'Enter / Space',
        action: { en: 'Select the focused tab (explicit mode)', es: 'Selecciona la pestaña enfocada (modo explícito)' },
      },
      {
        keys: 'Tab',
        action: {
          en: 'Leave the tab list and move into the panel content',
          es: 'Sale de la lista de pestañas y entra al contenido del panel',
        },
      },
    ],
    notes: [
      {
        en: 'Roles `tablist`, `tab` and `tabpanel` are set; only one tab is in the tab order at a time (roving tabindex). Hidden panels are `inert`.',
        es: 'Se definen los roles `tablist`, `tab` y `tabpanel`; solo una pestaña está en el orden de tabulación a la vez (tabindex itinerante). Los paneles ocultos son `inert`.',
      },
      {
        en: "The tab's accessible name is its `label`; keep labels short, unique and translated.",
        es: 'El nombre accesible de cada pestaña es su `label`; mantén las etiquetas cortas, únicas y traducidas.',
      },
      {
        en: 'Common mistake: putting content directly inside `hk-tab-panel` without `<ng-template>`. The panel requires a template and fails without it.',
        es: 'Error común: poner contenido directo dentro de `hk-tab-panel` sin `<ng-template>`. El panel exige un template y falla sin él.',
      },
    ],
  },
  performance: [
    {
      en: 'Only the active panel is instantiated, so grids, editors or charts in other tabs cost nothing until opened.',
      es: 'Solo se crea el panel activo, así que tablas, editores o gráficas en otras pestañas no cuestan nada hasta que se abren.',
    },
    {
      en: "The flip side: returning to a tab re-creates its components. Cache expensive data in a service instead of loading it in the panel's constructor each time.",
      es: 'La otra cara: volver a una pestaña vuelve a crear sus componentes. Guarda en un servicio los datos costosos en vez de cargarlos en el constructor del panel cada vez.',
    },
  ],
  related: [
    {
      id: 'wizard',
      note: {
        en: 'Ordered steps with validation instead of free switching.',
        es: 'Pasos ordenados con validación en vez de cambio libre.',
      },
    },
    { id: 'menu', note: { en: 'Navigation between pages rather than panels.', es: 'Navegación entre páginas en vez de paneles.' } },
    {
      id: 'forms',
      note: {
        en: 'Keep form state outside the tabs so it survives switching.',
        es: 'Mantén el estado del formulario fuera de las pestañas para que sobreviva al cambio.',
      },
    },
  ],
};

export default content;

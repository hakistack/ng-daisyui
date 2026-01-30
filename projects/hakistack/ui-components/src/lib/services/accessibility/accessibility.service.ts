import { DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * Interface matching backend AccessibilitySettings model
 */
export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  textSpacing: boolean;
  fontLevel: number;
}

/**
 * Accessibility Service following WCAG 2.1 Level AA/AAA Guidelines
 *
 * Features:
 * - Font size adjustment (WCAG 1.4.4 Resize Text)
 * - Text spacing controls (WCAG 1.4.12 Text Spacing)
 * - High contrast mode (WCAG 1.4.6 Contrast Enhanced)
 * - Reduced motion support (WCAG 2.3.3 Animation from Interactions)
 * - System preference detection (prefers-contrast, prefers-reduced-motion)
 * - ARIA live announcements with priority levels for screen readers
 * - Enhanced focus indicators (WCAG 2.4.7 Focus Visible)
 * - Focus management utilities (WCAG 2.4.3 Focus Order)
 * - Keyboard navigation support
 */
@Injectable({
  providedIn: 'root',
})
export class AccessibilityService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  // Constants following WCAG guidelines
  private static readonly STORAGE_KEYS = {
    fontLevel: 'a11y_fontLevel',
    highContrast: 'a11y_highContrast',
    reducedMotion: 'a11y_reducedMotion',
    keyboardOnly: 'a11y_keyboardOnly',
    textSpacing: 'a11y_textSpacing',
  } as const;

  private static readonly DEFAULT_FONT_LEVEL = 1;

  // WCAG 1.4.12 Text Spacing - Minimum required values
  private static readonly TEXT_SPACING_WCAG = {
    lineHeight: 1.5, // At least 1.5x font size
    paragraphSpacing: 2, // At least 2x font size
    letterSpacing: 0.12, // At least 0.12x font size
    wordSpacing: 0.16, // At least 0.16x font size
  } as const;

  // WCAG 1.4.4: Text should be resizable up to 200% without loss of content or functionality
  readonly levels = [0.875, 1, 1.125, 1.25, 1.5, 1.75, 2] as const;

  // DaisyUI v5 High Contrast Color Variables (using oklch for consistency)
  // These override DaisyUI's theme colors for maximum contrast (WCAG AAA 7:1 ratio)
  private static readonly HIGH_CONTRAST_VARS = {
    // Base colors - pure black/white for maximum contrast
    '--color-base-100': 'oklch(0% 0 0)', // Pure black background
    '--color-base-200': 'oklch(10% 0 0)', // Slightly lighter black
    '--color-base-300': 'oklch(15% 0 0)', // Even lighter for borders
    '--color-base-content': 'oklch(100% 0 0)', // Pure white text

    // Semantic colors with high contrast
    '--color-primary': 'oklch(70% 0.3 265)', // Bright blue
    '--color-primary-content': 'oklch(100% 0 0)', // White text
    '--color-secondary': 'oklch(75% 0.25 330)', // Bright magenta
    '--color-secondary-content': 'oklch(100% 0 0)', // White text
    '--color-accent': 'oklch(85% 0.25 110)', // Bright yellow-green
    '--color-accent-content': 'oklch(0% 0 0)', // Black text
    '--color-neutral': 'oklch(20% 0 0)', // Dark gray
    '--color-neutral-content': 'oklch(100% 0 0)', // White text

    // State colors with high contrast
    '--color-info': 'oklch(75% 0.2 240)', // Bright cyan
    '--color-info-content': 'oklch(0% 0 0)', // Black text
    '--color-success': 'oklch(70% 0.25 145)', // Bright green
    '--color-success-content': 'oklch(0% 0 0)', // Black text
    '--color-warning': 'oklch(85% 0.25 85)', // Bright yellow
    '--color-warning-content': 'oklch(0% 0 0)', // Black text
    '--color-error': 'oklch(65% 0.3 25)', // Bright red
    '--color-error-content': 'oklch(100% 0 0)', // White text

    // Border width increased for better visibility
    '--border': '2px',
  } as const;

  // Signals with optimized initialization
  fontLevel = signal<number>(this.getInitialFontLevel());
  highContrast = signal<boolean>(this.getInitialHighContrast());
  reducedMotion = signal<boolean>(this.getInitialReducedMotion());
  keyboardOnlyMode = signal<boolean>(false);
  textSpacingEnabled = signal<boolean>(this.getInitialTextSpacing());

  // System preference signals
  systemPrefersHighContrast = signal<boolean>(false);
  systemPrefersReducedMotion = signal<boolean>(false);

  // Live regions for announcements (polite and assertive)
  private liveRegionPolite: HTMLDivElement | null = null;
  private liveRegionAssertive: HTMLDivElement | null = null;

  // Focus management
  private focusHistory: HTMLElement[] = [];
  private focusTrapStack: HTMLElement[] = [];

  constructor() {
    this.initializeMediaQueryListeners();
    this.initializeLiveRegion();
    this.initializeKeyboardDetection();

    // Optimized effects with direct DOM manipulation
    effect(() => this.updateFontSize());
    effect(() => this.updateHighContrast());
    effect(() => this.updateReducedMotion());
    effect(() => this.updateKeyboardMode());
    effect(() => this.updateTextSpacing());
  }

  /** Initialize accessibility settings from localStorage and system preferences */
  initializeAccessibilitySettings(): void {
    // Re-read from storage to ensure we have the latest values
    const fontLevel = this.getInitialFontLevel();
    const highContrast = this.getInitialHighContrast();
    const reducedMotion = this.getInitialReducedMotion();
    const textSpacing = this.getInitialTextSpacing();

    // Only update if different to avoid unnecessary effects
    if (this.fontLevel() !== fontLevel) {
      this.fontLevel.set(fontLevel);
    }

    if (this.highContrast() !== highContrast) {
      this.highContrast.set(highContrast);
    }

    if (this.reducedMotion() !== reducedMotion) {
      this.reducedMotion.set(reducedMotion);
    }

    if (this.textSpacingEnabled() !== textSpacing) {
      this.textSpacingEnabled.set(textSpacing);
    }

    // Set initial ARIA attributes
    this.document.documentElement.setAttribute('lang', 'es'); // Update based on your i18n
  }

  // Font size controls (WCAG 1.4.4)
  increase(): void {
    const newLevel = Math.min(this.fontLevel() + 1, this.levels.length - 1);
    this.fontLevel.set(newLevel);
    this.announce(`Tamaño de fuente aumentado a ${Math.round(this.levels[newLevel] * 100)}%`);
  }

  decrease(): void {
    const newLevel = Math.max(this.fontLevel() - 1, 0);
    this.fontLevel.set(newLevel);
    this.announce(`Tamaño de fuente reducido a ${Math.round(this.levels[newLevel] * 100)}%`);
  }

  // High contrast controls (WCAG 1.4.6)
  toggleContrast(): void {
    const newState = !this.highContrast();
    this.highContrast.set(newState);
    this.announce(newState ? 'Modo de alto contraste activado' : 'Modo de alto contraste desactivado');
  }

  // Reduced motion controls (WCAG 2.3.3)
  toggleReducedMotion(): void {
    const newState = !this.reducedMotion();
    this.reducedMotion.set(newState);
    this.announce(newState ? 'Movimiento reducido activado' : 'Movimiento reducido desactivado');
  }

  // Text spacing controls (WCAG 1.4.12)
  toggleTextSpacing(): void {
    const newState = !this.textSpacingEnabled();
    this.textSpacingEnabled.set(newState);
    this.announce(newState ? 'Espaciado de texto mejorado activado' : 'Espaciado de texto mejorado desactivado');
  }

  // Reset all settings
  reset(): void {
    this.removeFromStorage(AccessibilityService.STORAGE_KEYS.fontLevel);
    this.removeFromStorage(AccessibilityService.STORAGE_KEYS.highContrast);
    this.removeFromStorage(AccessibilityService.STORAGE_KEYS.reducedMotion);
    this.removeFromStorage(AccessibilityService.STORAGE_KEYS.keyboardOnly);
    this.removeFromStorage(AccessibilityService.STORAGE_KEYS.textSpacing);

    this.fontLevel.set(AccessibilityService.DEFAULT_FONT_LEVEL);
    this.highContrast.set(this.systemPrefersHighContrast());
    this.reducedMotion.set(this.systemPrefersReducedMotion());
    this.keyboardOnlyMode.set(false);
    this.textSpacingEnabled.set(false);

    this.announce('Configuración de accesibilidad restaurada');
  }

  // Utility method to check if user prefers high contrast
  isHighContrastActive(): boolean {
    return this.highContrast() || this.systemPrefersHighContrast();
  }

  // Utility method to check if user prefers reduced motion
  isReducedMotionActive(): boolean {
    return this.reducedMotion() || this.systemPrefersReducedMotion();
  }

  // Focus Management Utilities (WCAG 2.4.3 Focus Order)

  /**
   * Save current focus to history for later restoration
   */
  saveFocus(): void {
    const activeElement = this.document.activeElement as HTMLElement;
    if (activeElement && activeElement !== this.document.body) {
      this.focusHistory.push(activeElement);
    }
  }

  /**
   * Restore focus to the last saved element
   */
  restoreFocus(): boolean {
    const element = this.focusHistory.pop();
    if (element && this.document.contains(element)) {
      element.focus();
      return true;
    }
    return false;
  }

  /**
   * Clear focus history
   */
  clearFocusHistory(): void {
    this.focusHistory = [];
  }

  /**
   * Focus the first focusable element within a container
   */
  focusFirstElement(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus trap - trap focus within a container (useful for modals/dialogs)
   */
  trapFocus(container: HTMLElement): void {
    this.saveFocus();
    this.focusTrapStack.push(container);

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = this.getFocusableElements(container);
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (this.document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (this.document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleFocusTrap);
    container.setAttribute('data-focus-trap', 'true');

    // Focus first element
    this.focusFirstElement(container);
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap(): void {
    const container = this.focusTrapStack.pop();
    if (container) {
      container.removeAttribute('data-focus-trap');
      // Remove event listener by cloning (simple approach)
      const clone = container.cloneNode(true) as HTMLElement;
      container.parentNode?.replaceChild(clone, container);
    }
    this.restoreFocus();
  }

  /**
   * Get all focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
      el => el.offsetParent !== null, // Filter out hidden elements
    );
  }

  // Screen Reader Announcements with Priority Levels

  /**
   * Announce a message to screen readers (polite - default)
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const liveRegion = priority === 'assertive' ? this.liveRegionAssertive : this.liveRegionPolite;
    if (!liveRegion) return;

    // Clear previous message
    liveRegion.textContent = '';

    // Set new message after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    }, 100);

    // Clear message after announcement
    const clearDelay = priority === 'assertive' ? 5000 : 3000;
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = '';
      }
    }, clearDelay);
  }

  /**
   * Announce an alert message (assertive priority)
   */
  announceAlert(message: string): void {
    this.announce(message, 'assertive');
  }

  /**
   * Announce a status message (polite priority)
   */
  announceStatus(message: string): void {
    this.announce(message, 'polite');
  }

  // Private initialization methods
  private initializeMediaQueryListeners(): void {
    // Listen for prefers-contrast changes (WCAG 1.4.6)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const contrastQuery = window.matchMedia('(prefers-contrast: more)');
      this.systemPrefersHighContrast.set(contrastQuery.matches);

      fromEvent<MediaQueryListEvent>(contrastQuery, 'change')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(e => {
          this.systemPrefersHighContrast.set(e.matches);
          if (e.matches && !this.highContrast()) {
            this.announce('Sistema: Preferencia de alto contraste detectada');
          }
        });

      // Listen for prefers-reduced-motion changes (WCAG 2.3.3)
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.systemPrefersReducedMotion.set(motionQuery.matches);

      fromEvent<MediaQueryListEvent>(motionQuery, 'change')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(e => {
          this.systemPrefersReducedMotion.set(e.matches);
          if (e.matches && !this.reducedMotion()) {
            this.announce('Sistema: Preferencia de movimiento reducido detectada');
          }
        });

      // Listen for forced-colors mode (Windows High Contrast)
      const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
      if (forcedColorsQuery.matches) {
        this.document.documentElement.classList.add('forced-colors');
      }

      fromEvent<MediaQueryListEvent>(forcedColorsQuery, 'change')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(e => {
          this.document.documentElement.classList.toggle('forced-colors', e.matches);
        });
    }
  }

  private initializeLiveRegion(): void {
    // Create ARIA live region for polite announcements
    this.liveRegionPolite = this.document.createElement('div');
    this.liveRegionPolite.setAttribute('role', 'status');
    this.liveRegionPolite.setAttribute('aria-live', 'polite');
    this.liveRegionPolite.setAttribute('aria-atomic', 'true');
    this.liveRegionPolite.className = 'sr-only';
    this.liveRegionPolite.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    this.document.body?.appendChild(this.liveRegionPolite);

    // Create ARIA live region for assertive announcements
    this.liveRegionAssertive = this.document.createElement('div');
    this.liveRegionAssertive.setAttribute('role', 'alert');
    this.liveRegionAssertive.setAttribute('aria-live', 'assertive');
    this.liveRegionAssertive.setAttribute('aria-atomic', 'true');
    this.liveRegionAssertive.className = 'sr-only';
    this.liveRegionAssertive.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    this.document.body?.appendChild(this.liveRegionAssertive);
  }

  private initializeKeyboardDetection(): void {
    // Detect keyboard-only navigation for enhanced focus indicators (WCAG 2.4.7)
    fromEvent<KeyboardEvent>(this.document, 'keydown')
      .pipe(debounceTime(100), takeUntilDestroyed(this.destroyRef))
      .subscribe(e => {
        if (e.key === 'Tab') {
          this.keyboardOnlyMode.set(true);
        }
      });

    fromEvent<MouseEvent>(this.document, 'mousedown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.keyboardOnlyMode.set(false);
      });
  }

  // Private update methods
  private getInitialFontLevel(): number {
    const stored = this.getFromStorage(AccessibilityService.STORAGE_KEYS.fontLevel);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return this.isValidFontLevel(parsed) ? parsed : AccessibilityService.DEFAULT_FONT_LEVEL;
  }

  private getInitialHighContrast(): boolean {
    const stored = this.getFromStorage(AccessibilityService.STORAGE_KEYS.highContrast);
    if (stored !== null) {
      return stored === 'true';
    }
    // Default to system preference if no stored value
    return (typeof window !== 'undefined' && window.matchMedia?.('(prefers-contrast: more)').matches) || false;
  }

  private getInitialReducedMotion(): boolean {
    const stored = this.getFromStorage(AccessibilityService.STORAGE_KEYS.reducedMotion);
    if (stored !== null) {
      return stored === 'true';
    }
    // Default to system preference if no stored value
    return (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) || false;
  }

  private getInitialTextSpacing(): boolean {
    const stored = this.getFromStorage(AccessibilityService.STORAGE_KEYS.textSpacing);
    return stored === 'true';
  }

  private isValidFontLevel(level: number): boolean {
    return !isNaN(level) && level >= 0 && level < this.levels.length;
  }

  private updateFontSize(): void {
    const currentLevel = this.fontLevel();
    const fontSize = `${this.levels[currentLevel]}rem`;

    this.document.documentElement.style.fontSize = fontSize;
    this.setInStorage(AccessibilityService.STORAGE_KEYS.fontLevel, currentLevel.toString());
  }

  private updateHighContrast(): void {
    const isHighContrast = this.highContrast();
    const root = this.document.documentElement;

    // Use class for CSS targeting
    root.classList.toggle('high-contrast', isHighContrast);

    // Set CSS custom properties for proper color control (better than filter)
    if (isHighContrast) {
      Object.entries(AccessibilityService.HIGH_CONTRAST_VARS).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      root.setAttribute('data-contrast', 'high');
    } else {
      Object.keys(AccessibilityService.HIGH_CONTRAST_VARS).forEach(key => {
        root.style.removeProperty(key);
      });
      root.removeAttribute('data-contrast');
    }

    this.setInStorage(AccessibilityService.STORAGE_KEYS.highContrast, isHighContrast.toString());
  }

  private updateReducedMotion(): void {
    const isReducedMotion = this.reducedMotion();

    this.document.documentElement.classList.toggle('reduce-motion', isReducedMotion);
    this.document.documentElement.setAttribute('data-motion', isReducedMotion ? 'reduced' : 'normal');
    this.setInStorage(AccessibilityService.STORAGE_KEYS.reducedMotion, isReducedMotion.toString());
  }

  private updateKeyboardMode(): void {
    const isKeyboardMode = this.keyboardOnlyMode();
    this.document.documentElement.classList.toggle('keyboard-navigation', isKeyboardMode);
  }

  private updateTextSpacing(): void {
    const isTextSpacingEnabled = this.textSpacingEnabled();
    const root = this.document.documentElement;

    // Use class for CSS targeting
    root.classList.toggle('enhanced-text-spacing', isTextSpacingEnabled);

    // Apply WCAG 1.4.12 text spacing requirements
    if (isTextSpacingEnabled) {
      root.style.setProperty('--a11y-line-height', AccessibilityService.TEXT_SPACING_WCAG.lineHeight.toString());
      root.style.setProperty('--a11y-paragraph-spacing', `${AccessibilityService.TEXT_SPACING_WCAG.paragraphSpacing}em`);
      root.style.setProperty('--a11y-letter-spacing', `${AccessibilityService.TEXT_SPACING_WCAG.letterSpacing}em`);
      root.style.setProperty('--a11y-word-spacing', `${AccessibilityService.TEXT_SPACING_WCAG.wordSpacing}em`);
      root.setAttribute('data-text-spacing', 'enhanced');
    } else {
      root.style.removeProperty('--a11y-line-height');
      root.style.removeProperty('--a11y-paragraph-spacing');
      root.style.removeProperty('--a11y-letter-spacing');
      root.style.removeProperty('--a11y-word-spacing');
      root.removeAttribute('data-text-spacing');
    }

    this.setInStorage(AccessibilityService.STORAGE_KEYS.textSpacing, isTextSpacingEnabled.toString());
  }

  // Storage utilities with error handling
  private getFromStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setInStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  private removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  // Backend Synchronization Methods

  /**
   * Export current accessibility settings as JSON object for backend persistence
   * Maps to C# AccessibilitySettings model
   */
  getAccessibilitySettings(): AccessibilitySettings {
    return {
      highContrast: this.highContrast(),
      reducedMotion: this.reducedMotion(),
      textSpacing: this.textSpacingEnabled(),
      fontLevel: this.fontLevel(),
    };
  }

  /**
   * Import accessibility settings from backend JSON and apply them
   * @param settings AccessibilitySettings object from backend
   */
  setAccessibilitySettings(settings: AccessibilitySettings): void {
    if (!settings) return;

    // Validate and apply font level
    if (typeof settings.fontLevel === 'number' && this.isValidFontLevel(settings.fontLevel)) {
      this.fontLevel.set(settings.fontLevel);
    }

    // Apply boolean settings
    if (typeof settings.highContrast === 'boolean') {
      this.highContrast.set(settings.highContrast);
    }

    if (typeof settings.reducedMotion === 'boolean') {
      this.reducedMotion.set(settings.reducedMotion);
    }

    if (typeof settings.textSpacing === 'boolean') {
      this.textSpacingEnabled.set(settings.textSpacing);
    }

    // Announce the import to screen readers
    this.announceStatus('Configuración de accesibilidad sincronizada');
  }

  /**
   * Get accessibility settings as JSON string for backend API calls
   */
  getAccessibilitySettingsJSON(): string {
    return JSON.stringify(this.getAccessibilitySettings());
  }

  /**
   * Import accessibility settings from JSON string received from backend
   * @param json JSON string from backend API
   */
  setAccessibilitySettingsFromJSON(json: string): void {
    try {
      const settings = JSON.parse(json) as AccessibilitySettings;
      this.setAccessibilitySettings(settings);
    } catch (error) {
      console.error('Failed to parse accessibility settings JSON:', error);
    }
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EditorComponent, EditorToolbarPreset } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { EDITOR_PLAYGROUND, EditorPgState } from '../specs/editor';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-editor-playground',
  imports: [PlaygroundComponent, EditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let s = view(raw);
        <hk-editor
          [toolbar]="s.toolbar"
          [placeholder]="s.placeholder"
          [editorHeight]="s.editorHeight"
          [slashCommands]="s.slashCommands"
          [readonly]="s.readonly"
          [disabled]="s.disabled"
          (textChange)="log('textChange', $event)"
          (editorFocus)="log('editorFocus', null)"
          (editorBlur)="log('editorBlur', null)"
          (editorReady)="log('editorReady', null)"
        />
      </ng-template>
    </app-playground>
  `,
})
export class EditorPlaygroundComponent {
  protected readonly spec = EDITOR_PLAYGROUND;
  protected view(raw: PlaygroundState) {
    const s = raw as EditorPgState;
    return { ...s, toolbar: s.toolbar as EditorToolbarPreset };
  }
}

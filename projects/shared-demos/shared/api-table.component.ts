import { Component, input } from '@angular/core';
import { ApiDocEntry } from './api-table.types';

@Component({
  selector: 'app-api-table',
  host: { class: 'block' },
  template: `
    <div class="card card-border card-bordered bg-base-200 overflow-hidden">
      <div class="flex items-center gap-2 px-4 sm:px-5 pt-4 pb-3">
        <span class="h-px w-4 bg-primary/50"></span>
        <h3 class="text-base font-serif leading-tight">{{ title() }}</h3>
        <span class="badge badge-ghost badge-sm font-mono ml-auto">{{ entries().length }}</span>
      </div>
      <div class="overflow-x-auto border-t border-base-content/8">
        <table class="table table-sm">
          <thead>
            <tr class="text-[10px] uppercase tracking-wider text-base-content/50 bg-base-300/30">
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.name) {
              <tr class="hover:bg-base-300/30 transition-colors">
                <td class="align-top">
                  <code class="text-primary text-xs font-semibold whitespace-nowrap">{{ entry.name }}</code>
                </td>
                <td class="align-top">
                  <code class="badge badge-ghost badge-sm text-xs font-mono">{{ entry.type }}</code>
                </td>
                <td class="align-top">
                  <code class="text-xs text-base-content/45 whitespace-nowrap">{{ entry.default ?? '—' }}</code>
                </td>
                <td class="text-sm text-base-content/70 leading-relaxed">{{ entry.description }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ApiTableComponent {
  title = input.required<string>();
  entries = input.required<ApiDocEntry[]>();
}

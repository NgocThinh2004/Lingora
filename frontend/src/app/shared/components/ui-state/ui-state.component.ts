import { Component, EventEmitter, Input, Output } from '@angular/core';

export type UiStateKind = 'loading' | 'empty' | 'error';

@Component({
  selector: 'app-ui-state',
  standalone: true,
  templateUrl: './ui-state.component.html',
  styleUrl: './ui-state.component.scss'
})
export class UiStateComponent {
  @Input({ required: true }) kind!: UiStateKind;
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();
}

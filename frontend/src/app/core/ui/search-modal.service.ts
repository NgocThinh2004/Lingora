
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchModalService {
  readonly isOpen = signal(false);

  open() { console.log('SearchModalService.open() CALLED!');
    this.isOpen.set(true);
  }

  close() { console.log('SearchModalService.close() CALLED!');
    this.isOpen.set(false);
  }
}

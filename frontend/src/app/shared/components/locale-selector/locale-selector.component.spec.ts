import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleSelectorComponent } from './locale-selector.component';

describe('LocaleSelectorComponent', () => {
  let component: LocaleSelectorComponent;
  let fixture: ComponentFixture<LocaleSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocaleSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LocaleSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows all locale options when opened', () => {
    const trigger = fixture.nativeElement.querySelector('.locale__trigger') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.locale__option');
    expect(options.length).toBe(3);
  });

  it('emits the selected locale and closes the menu', () => {
    spyOn(component.valueChange, 'emit');
    component.menuOpen.set(true);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.locale__option') as NodeListOf<HTMLButtonElement>;
    options[1].click();
    fixture.detectChanges();

    expect(component.valueChange.emit).toHaveBeenCalledWith('vi');
    expect(component.menuOpen()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.locale__menu')).toBeNull();
  });
});

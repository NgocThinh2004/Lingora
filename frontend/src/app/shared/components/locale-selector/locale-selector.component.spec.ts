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
    component.options = [
      { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w40/gb.png', isDefault: true },
      { code: 'vi', label: 'Tiếng Việt', flagUrl: 'https://flagcdn.com/w40/vn.png', isDefault: false },
      { code: 'zh', label: '中文', flagUrl: 'https://flagcdn.com/w40/cn.png', isDefault: false },
    ];
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

  it('supports the compact auth placement without changing the admin placement', () => {
    component.compact = true;
    component.small = true;
    component.menuPosition = 'bottom-end';
    fixture.detectChanges();

    const locale = fixture.nativeElement.querySelector('.locale') as HTMLElement;
    expect(locale.classList.contains('locale--compact')).toBeTrue();
    expect(locale.classList.contains('locale--small')).toBeTrue();
    expect(locale.classList.contains('locale--menu-bottom-end')).toBeTrue();
  });
});

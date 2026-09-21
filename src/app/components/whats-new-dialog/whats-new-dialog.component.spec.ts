import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WhatsNewDialogComponent } from './whats-new-dialog.component';
import { ReleaseNote } from '../../interfaces/release-note';

describe('WhatsNewDialogComponent', () => {
  let fixture: ComponentFixture<WhatsNewDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<WhatsNewDialogComponent>>;

  const release: ReleaseNote = {
    version: '1.4.0',
    title: "What's New in Edunexify",
    summary: 'A few recent improvements.',
    items: ['Improved photo and file storage', 'Cleaner email communication'],
    publishedAt: '2026-09-21',
  };

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [WhatsNewDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: release },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WhatsNewDialogComponent);
    fixture.detectChanges();
  });

  it('renders the release title, summary and every item', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain("What's New in Edunexify");
    expect(text).toContain('A few recent improvements.');
    expect(text).toContain('Improved photo and file storage');
    expect(text).toContain('Cleaner email communication');
  });

  it('closes the dialog when "Got it" is clicked', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.wn-btn-close');
    button.click();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});

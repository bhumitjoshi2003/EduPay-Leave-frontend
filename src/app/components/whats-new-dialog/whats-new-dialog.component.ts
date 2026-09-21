import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ReleaseNote } from '../../interfaces/release-note';

@Component({
  selector: 'app-whats-new-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './whats-new-dialog.component.html',
  styleUrl: './whats-new-dialog.component.css',
})
export class WhatsNewDialogComponent {
  constructor(
    public ref: MatDialogRef<WhatsNewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public release: ReleaseNote,
  ) {}

  close(): void {
    this.ref.close();
  }
}

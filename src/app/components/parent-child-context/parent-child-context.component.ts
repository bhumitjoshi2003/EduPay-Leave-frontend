import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';
import { AuthStateService } from '../../auth/auth-state.service';
import { ChildAccess } from '../../interfaces/parent-portal';
import { ParentChildContextService } from '../../services/parent-child-context.service';
import { ParentPortalService } from '../../services/parent-portal.service';

@Component({
  selector: 'app-parent-child-context', standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './parent-child-context.component.html',
  styleUrl: './parent-child-context.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParentChildContextComponent implements OnChanges {
  @Input({ required: true }) studentId = '';
  child: ChildAccess | null = null;
  invalid = false;
  readonly isParent: boolean;

  constructor(
    authState: AuthStateService,
    private parentPortal: ParentPortalService,
    private context: ParentChildContextService,
    private cdr: ChangeDetectorRef
  ) { this.isParent = authState.getUserRole() === 'PARENT'; }

  ngOnChanges(): void {
    if (!this.isParent || !this.studentId) return;
    this.parentPortal.getMyProfile().pipe(take(1)).subscribe({
      next: profile => {
        this.child = profile.children.find(child => child.studentId === this.studentId) ?? null;
        this.invalid = !this.child;
        this.child ? this.context.select(this.child) : this.context.clear();
        this.cdr.markForCheck();
      },
      error: () => { this.context.clear(); this.invalid = true; this.cdr.markForCheck(); }
    });
  }
}

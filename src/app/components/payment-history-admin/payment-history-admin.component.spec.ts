import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentHistoryAdminComponent } from './payment-history-admin.component';

describe('PaymentHistoryAdminComponent', () => {
  let component: PaymentHistoryAdminComponent;
  let fixture: ComponentFixture<PaymentHistoryAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentHistoryAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentHistoryAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

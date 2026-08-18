import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValveManagementComponent } from './valve-management.component';

describe('ValveManagementComponent', () => {
  let component: ValveManagementComponent;
  let fixture: ComponentFixture<ValveManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValveManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValveManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

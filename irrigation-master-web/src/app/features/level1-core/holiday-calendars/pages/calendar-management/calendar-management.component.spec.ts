import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarManagementComponent } from './calendar-management.component';

describe('CalendarManagementComponent', () => {
  let component: CalendarManagementComponent;
  let fixture: ComponentFixture<CalendarManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

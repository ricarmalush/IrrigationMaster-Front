import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnSchedulerComponent } from './turn-scheduler.component';

describe('TurnSchedulerComponent', () => {
  let component: TurnSchedulerComponent;
  let fixture: ComponentFixture<TurnSchedulerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnSchedulerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnSchedulerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

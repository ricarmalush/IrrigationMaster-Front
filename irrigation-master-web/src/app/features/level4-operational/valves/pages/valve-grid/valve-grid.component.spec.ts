import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValveGridComponent } from './valve-grid.component';

describe('ValveGridComponent', () => {
  let component: ValveGridComponent;
  let fixture: ComponentFixture<ValveGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValveGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValveGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotDetailComponent } from './plot-detail.component';

describe('PlotDetailComponent', () => {
  let component: PlotDetailComponent;
  let fixture: ComponentFixture<PlotDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlotDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlotDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalkwayListComponent } from './walkway-list.component';

describe('WalkwayListComponent', () => {
  let component: WalkwayListComponent;
  let fixture: ComponentFixture<WalkwayListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalkwayListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalkwayListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

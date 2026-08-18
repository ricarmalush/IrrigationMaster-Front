import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LicenceListComponent } from './licence-list.component';

describe('LicenceListComponent', () => {
  let component: LicenceListComponent;
  let fixture: ComponentFixture<LicenceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenceListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicenceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

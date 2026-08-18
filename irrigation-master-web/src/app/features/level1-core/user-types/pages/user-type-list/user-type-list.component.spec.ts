import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserTypeListComponent } from './user-type-list.component';

describe('UserTypeListComponent', () => {
  let component: UserTypeListComponent;
  let fixture: ComponentFixture<UserTypeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserTypeListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserTypeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

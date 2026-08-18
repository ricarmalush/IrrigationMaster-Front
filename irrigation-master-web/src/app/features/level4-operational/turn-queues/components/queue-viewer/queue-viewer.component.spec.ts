import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueueViewerComponent } from './queue-viewer.component';

describe('QueueViewerComponent', () => {
  let component: QueueViewerComponent;
  let fixture: ComponentFixture<QueueViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QueueViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

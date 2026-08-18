import { TestBed } from '@angular/core/testing';

import { SensorReadingService } from './sensor-reading.service';

describe('SensorReadingService', () => {
  let service: SensorReadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SensorReadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

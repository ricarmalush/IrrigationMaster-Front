import { TestBed } from '@angular/core/testing';

import { IrrigationLogService } from './irrigation-log.service';

describe('IrrigationLogService', () => {
  let service: IrrigationLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IrrigationLogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

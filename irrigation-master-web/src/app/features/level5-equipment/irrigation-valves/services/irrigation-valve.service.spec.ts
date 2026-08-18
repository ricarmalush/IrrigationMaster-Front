import { TestBed } from '@angular/core/testing';

import { IrrigationValveService } from './irrigation-valve.service';

describe('IrrigationValveService', () => {
  let service: IrrigationValveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IrrigationValveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

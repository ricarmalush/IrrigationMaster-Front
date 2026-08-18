import { TestBed } from '@angular/core/testing';

import { IrrigationDeviceService } from './irrigation-device.service';

describe('IrrigationDeviceService', () => {
  let service: IrrigationDeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IrrigationDeviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

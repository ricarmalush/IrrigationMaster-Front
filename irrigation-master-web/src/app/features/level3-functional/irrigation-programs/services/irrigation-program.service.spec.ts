import { TestBed } from '@angular/core/testing';

import { IrrigationProgramService } from './irrigation-program.service';

describe('IrrigationProgramService', () => {
  let service: IrrigationProgramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IrrigationProgramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

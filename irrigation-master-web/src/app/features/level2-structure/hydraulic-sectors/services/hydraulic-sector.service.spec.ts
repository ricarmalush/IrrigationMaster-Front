import { TestBed } from '@angular/core/testing';

import { HydraulicSectorService } from './hydraulic-sector.service';

describe('HydraulicSectorService', () => {
  let service: HydraulicSectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HydraulicSectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

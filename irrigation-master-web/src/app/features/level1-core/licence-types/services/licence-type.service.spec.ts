import { TestBed } from '@angular/core/testing';

import { LicenceTypeService } from './licence-type.service';

describe('LicenceTypeService', () => {
  let service: LicenceTypeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LicenceTypeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

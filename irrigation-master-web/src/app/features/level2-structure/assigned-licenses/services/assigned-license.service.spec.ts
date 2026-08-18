import { TestBed } from '@angular/core/testing';

import { AssignedLicenseService } from './assigned-license.service';

describe('AssignedLicenseService', () => {
  let service: AssignedLicenseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssignedLicenseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

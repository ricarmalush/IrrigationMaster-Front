import { TestBed } from '@angular/core/testing';

import { PriorityTypeService } from './priority-type.service';

describe('PriorityTypeService', () => {
  let service: PriorityTypeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PriorityTypeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

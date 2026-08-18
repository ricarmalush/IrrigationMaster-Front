import { TestBed } from '@angular/core/testing';

import { IrrigationRuleService } from './irrigation-rule.service';

describe('IrrigationRuleService', () => {
  let service: IrrigationRuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IrrigationRuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

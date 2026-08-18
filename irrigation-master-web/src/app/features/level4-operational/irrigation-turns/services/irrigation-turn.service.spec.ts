import { TestBed } from '@angular/core/testing';

import { IrrigationTurnService } from './irrigation-turn.service';

describe('IrrigationTurnService', () => {
  let service: IrrigationTurnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IrrigationTurnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

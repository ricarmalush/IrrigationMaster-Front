import { TestBed } from '@angular/core/testing';

import { TurnQueueService } from './turn-queue.service';

describe('TurnQueueService', () => {
  let service: TurnQueueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TurnQueueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

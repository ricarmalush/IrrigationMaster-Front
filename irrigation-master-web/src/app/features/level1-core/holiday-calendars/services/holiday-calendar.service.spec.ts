import { TestBed } from '@angular/core/testing';

import { HolidayCalendarService } from './holiday-calendar.service';

describe('HolidayCalendarService', () => {
  let service: HolidayCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HolidayCalendarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

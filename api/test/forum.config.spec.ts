import { daySlots, type ForumConfig } from '../src/forum.config.js';

const config: ForumConfig = {
  date: '2026-11-19',
  opensAt: '09:00',
  closesAt: '17:00',
  utcOffset: '+01:00',
  slotMinutes: 20,
  maxBookingsPerStudent: 5,
};

describe('daySlots', () => {
  it('cuts the day into back-to-back slots, Paris time', () => {
    const slots = daySlots(config);

    expect(slots).toHaveLength(24);
    expect(slots[0].startsAt.toISOString()).toBe('2026-11-19T08:00:00.000Z');
    expect(slots[1].startsAt).toEqual(slots[0].endsAt);
    expect(slots.at(-1)!.endsAt.toISOString()).toBe('2026-11-19T16:00:00.000Z');
  });

  it('drops a last slot that would end after closing time', () => {
    expect(daySlots({ ...config, closesAt: '10:30', slotMinutes: 45 })).toHaveLength(2);
  });
});

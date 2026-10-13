import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Register from '../pages/Register';
import { post } from '../services/api';

const fixture = vi.hoisted(() => ({
  event: {
    id: 'EVENT-TEST', slug: 'two-seat-lab', title: 'The Two-Seat Lab',
    category: 'Workshop', mode: 'SOLO', minTeamSize: 1, maxTeamSize: 1,
    capacity: 2, availableUnits: 1, unit: 'seats', canRegister: true,
    availability: 'available', status: 'published',
    startAt: '2030-01-01T09:00:00Z', venue: 'Demo Studio',
  },
}));

vi.mock('../hooks/useResource', () => ({ useResource: () => ({ data: fixture.event, loading: false, error: null }) }));
vi.mock('../hooks/Session', () => ({ useSession: () => ({ session: { csrfToken: 'test-csrf', organizer: null, config: {} } }) }));
vi.mock('../services/api', () => ({ post: vi.fn(), saveText: vi.fn() }));

beforeEach(() => {
  vi.mocked(post).mockReset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

async function fillAndReview() {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/events/two-seat-lab/register']}><Routes><Route path="/events/:slug/register" element={<Register/>}/></Routes></MemoryRouter>);
  await user.type(screen.getByLabelText('Full name'), 'Asha Demo');
  await user.type(screen.getByLabelText('Student ID'), 'DEMO-A001');
  await user.type(screen.getByLabelText('Email address'), 'asha.demo@example.com');
  await user.type(screen.getByLabelText('Department'), 'Computing');
  await user.selectOptions(screen.getByLabelText('Year of study'), '7');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /Review registration/ }));
  return user;
}

describe('registration form request boundary', () => {
  it('submits numeric year once, waits for persistence, and trusts the returned waitlist status', async () => {
    let complete;
    vi.mocked(post).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const user = await fillAndReview();
    await user.click(screen.getByRole('button', { name: /Confirm registration/ }));
    expect(post).toHaveBeenCalledTimes(1);
    const [path, payload] = vi.mocked(post).mock.calls[0];
    expect(path).toBe('/events/two-seat-lab/registrations');
    expect(payload.members).toHaveLength(1);
    expect(payload.members[0].year).toBe(7);
    expect(payload.consent).toBe(true);
    expect(screen.getByRole('button', { name: /Saving registration/ }).disabled).toBe(true);
    expect(screen.queryByText('Your place is confirmed.')).toBeNull();
    complete({
      event: { ...fixture.event, availableUnits: 0, availability: 'waitlist' },
      managementCode: 'test-private-management-code',
      registration: { passId: 'CF-RESULT', eventId: fixture.event.id, status: 'WAITLISTED', waitlistPosition: 1, teamName: '', leaderId: 'M1', members: [{ ...payload.members[0], id: 'M1', attendance: null }] },
    });
    expect(await screen.findByRole('heading', { name: 'You’re on the waiting list.' })).toBeTruthy();
    expect(screen.getByText('NOT A CONFIRMED ADMISSION PASS')).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('retains valid details after a duplicate conflict and never retries the POST itself', async () => {
    const conflict = Object.assign(new Error('This participant is already registered.'), {
      status: 409, fields: { 'members.0.studentId': 'This student ID or email is already registered.' },
    });
    vi.mocked(post).mockRejectedValue(conflict);
    const user = await fillAndReview();
    await user.click(screen.getByRole('button', { name: /Confirm registration/ }));
    await waitFor(() => expect(screen.getByLabelText('Full name').value).toBe('Asha Demo'));
    expect(screen.getByLabelText('Email address').value).toBe('asha.demo@example.com');
    expect(screen.getByLabelText('Year of study').value).toBe('7');
    expect(screen.getByLabelText('Student ID').getAttribute('aria-invalid')).toBe('true');
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Your place is confirmed.')).toBeNull();
  });
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingControls } from '@/components/study/RatingControls';

describe('RatingControls', () => {
  it('disables all rating buttons before the answer is revealed', () => {
    render(<RatingControls disabled onRate={() => {}} />);
    for (const label of ['Again', 'Hard', 'Good', 'Easy']) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeDisabled();
    }
  });

  it('enables rating buttons after reveal and calls onRate with the correct rating', async () => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<RatingControls disabled={false} onRate={onRate} />);

    const goodButton = screen.getByRole('button', { name: /good/i });
    expect(goodButton).toBeEnabled();
    await user.click(goodButton);
    expect(onRate).toHaveBeenCalledWith('good');
  });

  it('maps each button to its expected rating value', async () => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<RatingControls disabled={false} onRate={onRate} />);

    await user.click(screen.getByRole('button', { name: /again/i }));
    await user.click(screen.getByRole('button', { name: /hard/i }));
    await user.click(screen.getByRole('button', { name: /easy/i }));

    expect(onRate).toHaveBeenNthCalledWith(1, 'again');
    expect(onRate).toHaveBeenNthCalledWith(2, 'hard');
    expect(onRate).toHaveBeenNthCalledWith(3, 'easy');
  });
});

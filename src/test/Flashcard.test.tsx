import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Flashcard } from '@/components/study/Flashcard';
import { createDefaultProgress } from '@/types';
import type { Card } from '@/types';

const card: Card = {
  id: 'card-1',
  datasetId: 'dataset-1',
  sourceRowIndex: 0,
  topic: 'Java',
  term: 'polymorphism',
  definition: 'Ability to take many forms',
  example: 'Animal a = new Dog();',
  notes: 'Core OOP concept',
  tags: ['oop'],
  originalRow: {},
  progress: createDefaultProgress()
};

describe('Flashcard', () => {
  it('shows the term and a reveal button before being revealed', () => {
    render(<Flashcard card={card} revealed={false} onReveal={() => {}} />);
    expect(screen.getByText('polymorphism')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reveal answer/i })).toBeInTheDocument();
  });

  it('calls onReveal when the reveal button is clicked', async () => {
    const onReveal = vi.fn();
    const user = userEvent.setup();
    render(<Flashcard card={card} revealed={false} onReveal={onReveal} />);
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('renders the definition, example, notes, and tags once revealed', () => {
    render(<Flashcard card={card} revealed onReveal={() => {}} />);
    expect(screen.getByText('Ability to take many forms')).toBeInTheDocument();
    expect(screen.getByText('Animal a = new Dog();')).toBeInTheDocument();
    expect(screen.getByText('Core OOP concept')).toBeInTheDocument();
    expect(screen.getByText('oop')).toBeInTheDocument();
  });
});

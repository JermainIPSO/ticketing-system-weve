import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('renders the login screen', () => {
    render(<App />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Support, der Eindruck macht.')).toBeInTheDocument();
  });
});

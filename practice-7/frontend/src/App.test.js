import { render, screen } from '@testing-library/react';
import App from './App';

test('renders products page header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Склад оружейного магазина/i);
  expect(headerElement).toBeInTheDocument();
});

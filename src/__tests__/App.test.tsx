import '@testing-library/jest-dom';
import { render, act } from '@testing-library/react';
import App from '../renderer/App';

beforeAll(() => {
  // Mock the electron window API
  (window as any).electron = {
    dns: {
      getCurrentDns: jest.fn().mockResolvedValue(['192.168.1.1']),
      testDnsSpeed: jest.fn().mockResolvedValue(15),
    },
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
    },
  };
});

describe('App', () => {
  it('should render', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(document.querySelector('.min-h-screen')).toBeTruthy();
  });
});

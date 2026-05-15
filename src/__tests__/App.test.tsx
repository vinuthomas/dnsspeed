import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import App from '../renderer/App';

beforeAll(() => {
  // Mock the electron window API
  (window as any).electron = {
    dns: {
      getCurrentDns: jest.fn().mockResolvedValue(['1.1.1.1']),
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
  it('should render', () => {
    expect(render(<App />)).toBeTruthy();
  });
});

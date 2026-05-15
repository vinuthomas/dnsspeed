# DNSSpeed ⚡️

[![Platform: macOS | Windows | Linux](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue.svg)](https://github.com/yourusername/dnsspeedcheck)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-blue.svg)](https://www.electronjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg)](https://tailwindcss.com/)

DNSSpeed is a modern, cross-platform desktop application designed to help you analyze, benchmark, and optimize your internet connection by finding the fastest DNS servers for your location. 

Built with Electron, React, and Tailwind CSS, DNSSpeed provides a sleek and intuitive dashboard to test your current system DNS against popular public DNS providers and your own custom entries.

## ✨ Features

- **🚀 Automated Benchmarking**: Instantly test the resolution speed of multiple DNS servers concurrently.
- **🔍 Auto-Detection**: Automatically detects and displays the DNS servers currently configured on your system.
- **📊 Built-in Providers**: Comes pre-configured with popular, high-performance DNS providers including:
  - Google (8.8.8.8)
  - Cloudflare (1.1.1.1)
  - Quad9 (9.9.9.9)
  - Control D
  - NextDNS
  - AdGuard
- **🛠 Custom Server Management**: Easily add, edit, and remove your own custom DNS IP addresses to test against the baseline. Custom lists are saved locally.
- **💀 Uptime Detection**: Identifies and flags unresponsive or dead DNS servers with a timeout mechanism.
- **💻 Cross-Platform**: Runs seamlessly on macOS, Windows, and Linux.
- **🌙 Dark Mode UI**: A beautiful, modern dark-themed interface built with Tailwind CSS.

## 🛠 Tech Stack

- **Framework:** [Electron](https://www.electronjs.org/)
- **Frontend:** [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Scaffolding:** [Electron React Boilerplate](https://electron-react-boilerplate.js.org/)

## 🚀 Getting Started

### Prerequisites

You will need [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dnsspeedcheck.git
   cd dnsspeedcheck
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application in development mode:
   ```bash
   npm start
   ```

### Packaging for Release

To build the application into a standalone executable for your current operating system, run:

```bash
npm run package
```
The packaged application will be available in the `release/build` directory.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/dnsspeedcheck/issues).

## 📝 License

This project is licensed under the MIT License.

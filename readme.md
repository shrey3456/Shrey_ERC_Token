# Shrey Token ICO Sale DApp

A decentralized application (DApp) for token sale with an animated cyberpunk UI theme. This project allows users to purchase SHREY tokens using ETH through a modern web interface.

## 🚀 Features

- Interactive token purchase interface
- Real-time token sale progress tracking
- Animated cyberpunk UI design
- MetaMask integration
- Responsive design
- Automatic animations and transitions

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [Ganache](https://trufflesuite.com/ganache/) for local blockchain
- [MetaMask](https://metamask.io/) browser extension
- [Truffle Framework](https://www.trufflesuite.com/)

## 🛠 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/token-sale-dapp.git
cd token-sale-dapp
```

2. Install dependencies:
```bash
npm install
```

3. Start Ganache and create a workspace

4. Configure MetaMask:
   - Network Name: Ganache
   - New RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH

5. Deploy smart contracts:
```bash
truffle migrate --reset
```

## 💻 Usage

1. Start the local development server:
```bash
npm run dev
# or use Live Server in VS Code
```

2. Connect MetaMask to Ganache network

3. Visit http://localhost:3000 in your browser

## 🏗 Project Structure

```
TOKEN_SALE/
├── src/
│   ├── index.html          # Main DApp interface
│   ├── css/                # Stylesheets
│   └── js/                 # JavaScript files
├── contracts/              # Smart contracts
├── migrations/             # Truffle migration files
├── test/                   # Contract tests
└── truffle-config.js      # Truffle configuration
```

## 🔧 Smart Contract Configuration

The smart contract is deployed with the following parameters:
- Initial supply: 1,000,000 tokens
- Token price: 0.001 ETH
- Token Symbol: SHREY

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🔗 Links

- [Truffle Framework](https://www.trufflesuite.com/)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [MetaMask](https://metamask.io/)

## 👤 Author

Your Name
- GitHub: [@shrey3456](https://github.com/shrey3456)
- LinkedIn: [Shrey Patel](https://www.linkedin.com/in/shrey-patel-7168a724b/)

## 🙏 Acknowledgments

- OpenZeppelin for smart contract standards
- Truffle Suite for development framework
- MetaMask for wallet integration
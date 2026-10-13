import { PrivyClientConfig } from '@privy-io/react-auth'

export const privyConfig: PrivyClientConfig = {
  appearance: {
    theme: 'dark',
    accentColor: '#6366f1',
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'users-without-wallets',
    },
    showWalletUIs: false,
  },
  // Privy's modal also offers passkey signup when enabled in the dashboard.
  // The modal handles the configured CAPTCHA provider internally.
  loginMethods: ['email', 'google', 'passkey'],
}

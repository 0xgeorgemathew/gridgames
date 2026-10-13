# Privy passkeys and Turnstile

The web app uses Privy's built-in modal for email, Google and passkey login.
The same modal offers passkey signup when that option is enabled in the Privy
dashboard. Existing users can choose **Add passkey** on the game selection
screen after signing in. This calls `usePrivy().linkPasskey()` and links the
credential to the current account. Users who already have a passkey can choose
**Add another passkey** to enroll another device.

The Farcaster/Base Mini App authentication flow continues to use Quick Auth.
Passkey account controls are only shown for signed-in web users.

## Deployment verification — 11 October 2026

Deployed the validated working tree to Worker `grid-games-pivot` at
`https://pivot.gridgames.space`, version
`8eedacfb-fdfe-48aa-b81d-c877d107c233`, with 100% traffic. Cloudflare records the
deployment at `2026-10-10T18:31:21.746407Z`. The preceding version was
`cf18b469-bf53-4989-8327-daf91ef5e8c8`.

The live menu shows **Log in / Sign up**. Its Privy modal exposes email, Google
and **I have a passkey**. Selecting the passkey option exposes **Create new
account** and **Log in with a passkey**, confirming that passkey signup is
enabled for the configured Privy app.

The automated browser received Turnstile error `600010`. Cloudflare documents
`600*` as a generic challenge failure associated with bot detection. No user
account or passkey was created during this check. Complete the device-level
enrollment and account-continuity checks below in a normal browser.

Pre-deployment checks passed: TypeScript, scoped ESLint, all 92 project tests,
production build and Wrangler deployment dry run.

## Dashboard setup

Use the Privy app that matches the frontend's `NEXT_PUBLIC_PRIVY_APP_ID`.

1. In **Login methods / Authentication**, enable **Passkeys** as a login method
   and **Passkeys as a signup method**. Keep email and Google enabled alongside
   them. Passkey signup creates a new account; existing users should sign in
   first and use **Add passkey** to retain their current account and wallet.
2. In **Basics → Domains and clients**, confirm that allowed origins include
   `https://pivot.gridgames.space`. If you use the Worker preview URL, also add
   `https://grid-games-pivot.mathew.workers.dev`. Allow the localhost origin and
   actual port used for development when applicable. Origins include the
   scheme and port, without route paths. This frontend does not specify a
   separate Privy app client.
3. In **Basics → Advanced**, leave **Enable CAPTCHA** on with **Turnstile**
   selected, as in the supplied screenshot. The installed React SDK's modal
   mounts CAPTCHA and supplies the verification token for passkey login and
   signup, as well as the other supported login methods. This integration
   needs no separate Turnstile widget, site key or secret in this repository.
4. Keep automatic Ethereum embedded-wallet creation enabled for users without
   wallets. The frontend already requests this with
   `embeddedWallets.ethereum.createOnLogin: 'users-without-wallets'`; game entry
   depends on the resulting wallet for all web login methods.
5. Save the settings and deploy the updated frontend through the normal Pivot
   deployment workflow. Dashboard settings alone do not override the
   frontend's explicitly configured login methods.

The **Android key hashes** setting in the screenshot is for native Android
applications; this web integration does not require it. Passkeys do not need
OAuth redirect URLs. Keep any existing Google redirect configuration.

## Turnstile integration

`@privy-io/react-auth` is already installed at version 3.13.1. Its `Captcha`
component documentation explicitly states that the Privy modal handles CAPTCHA
internally and that only one CAPTCHA component should be mounted at a time.
Do not add a second CAPTCHA component alongside these modal flows.

The repository currently sets no Content Security Policy. If one is configured
outside the repo, allow `https://challenges.cloudflare.com` in both `script-src`
and `frame-src`, following Privy's CSP guide.

## Verify on the target site

1. Open the HTTPS app in a browser that supports passkeys. Open **Log in / Sign
   up** and check that email, Google and passkey options are available.
2. Sign in to an existing account with Google or email. Note its Privy user ID
   and wallet, choose **Add passkey**, and complete the device prompt. The
   account should gain a `passkey` linked account, and the button should become
   **Add another passkey**.
3. Log out and choose passkey login. Confirm that it returns to the same Privy
   user ID and wallet and that game entry works.
4. For a new account, choose passkey signup from the Privy modal. Confirm that
   a new user and embedded Ethereum wallet are created and game entry works.
5. Cancel a passkey prompt and retry. Confirm that Google and email remain
   usable and CAPTCHA has no errors in the browser console.

Test on the intended domain. Passkeys are scoped to their WebAuthn relying
party; do not assume a credential created on localhost or a Worker preview
hostname will work on the custom domain.

## References

- [Privy passkey authentication](https://docs.privy.io/authentication/user-authentication/login-methods/passkey)
- [Linking accounts](https://docs.privy.io/user-management/users/linking-accounts)
- [CAPTCHA on login](https://docs.privy.io/authentication/user-authentication/captcha)
- [App clients and allowed origins](https://docs.privy.io/basics/get-started/dashboard/app-clients)
- [Content Security Policy requirements](https://docs.privy.io/security/implementation-guide/content-security-policy)
- [Turnstile error codes](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/)

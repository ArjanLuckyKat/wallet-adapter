import type { WalletName } from '@solana/wallet-adapter-base';
import {
    WalletConfigError,
    WalletDisconnectedError,
    WalletLoadError,
    WalletTimeoutError,
    WalletWindowBlockedError,
    WalletWindowClosedError,
} from '@solana/wallet-adapter-base';
import type * as lk from '@luckykatstudios/lucky-wallet-adapter';
import {
    BaseMessageSignerWalletAdapter,
    WalletAccountError,
    WalletConnectionError,
    WalletDisconnectionError,
    WalletError,
    WalletNotConnectedError,
    WalletNotReadyError,
    WalletPublicKeyError,
    WalletReadyState,
    WalletSignMessageError,
    WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import type { Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

type LuckyWalletAdapterExternal = lk.default;

interface IdTokenProvider {
    getIdToken: () => Promise<string>;
}

export interface LuckyWalletAdapterConfig {
    appUrl: string;
    lkServerUrl: string; // URL to Lucky Kat server
    idTokenProvider?: IdTokenProvider;
    overrideWalletAppUrl?: string;
}

export const LuckyWalletName = 'Lucky Wallet' as WalletName<'Lucky Wallet'>;

export class LuckyWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = LuckyWalletName;
    url = 'https://lucky-kat.com';
    icon =
        'data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NTAgNjAzLjk5Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2ZmZjt9PC9zdHlsZT48L2RlZnM+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNTI2LjQ0LDEyOC45YzEuNTUsOS0xLjIzLDExLjYzLTEuMjMsMTEuNjNBMy40NiwzLjQ2LDAsMCwxLDUyMSwxNDBjLTItMS45MS0uMjUtMi4xLTYuMTktMy4yMXMtNS43NSwzLjE1LTguNjYsMS40OC0zLjIyLTUuNjktOS40MS01Ljk0LTIuNjYsMy40LTEwLjM5LDQuMjEtOC43OS00LjIxLTkuNDEtMy0xLjg2LDItLjQ5LDYuNjgsNy40NCw1Ljc4LDEwLjM5LDUuNDVjNi44Ni0uNzcsMy43My00LDEyLjM4Ljc0czguOTEsNS42OSw4LjkxLDUuNjktLjkzLDIwLjM3LTMsODYuMTQtNy44MiwzNS41MS00LjcsNjQuNmMzLjE0LDI5LjM3LDEwLjg3LDU2LjkyLDEwLjE0LDkyLjA4cy04LjksNjAuODQtNDAuNTksOTUuNTRjLTMyLjkyLDM2LjA2LTg0LjksMzIuNjgtODQuOSwzMi42OGwtLjI1LTIwOS45cy0xNS45LS42OS02MS42My0uMjUtNTUuMzYuODQtNTUuNDQtMmMtLjItNi4zLTctNDEuNDItMTkuMDYtNDhzLTkuNTEsMS41LTguNjcsNC45NWMxLjIzLDUsNi42NywyMCw3LjkyLDI3LjcyLDIuMDUsMTIuNTctLjI0LDI3LjQ4LTEwLjg5LDMwLjJzLTE3LjYzLDQuOTMtMzQuNC0yLjcyYy0yNS4yNS0xMS41MS0yMC44Ni0yOC0yNi0xOS4zMS0yLjE1LDMuNjUtNC40Niw1Ljk0LjQ5LDE2LjgzczEzLjYyLDIzLjI3LDI5LDI4LjQ3LDMwLjItMiwzMC4yLTIsLjUsMTYuNTgsMCwyMi41MmMtMS4yNSwxNS0uNDksMTU0LjQ2LS40OSwxNTQuNDZzLTE3LjA2LS41OC0zOS4xMS05LjE2Yy0yOC4yOC0xMS01MC4yNC0yNC42My03MC43OS02NC44NUM5MC40NSwzODAuNjksMTM4LjgzLDI2NC42NSwxNDYuNzUsMjQ0YzEwLjY5LTI3LjksMjQuODEtNzEsNDMuMDctMTEwLjY0LDEzLTI4LjIzLDM0LjgzLTczLjM4LDQzLjMxLTg1LjY0LDE0LjQ1LTIwLjg5LDI5LjctMjkuNDUsMzAuNy0yOS40NiwxNi40OC0uMTQsNDguMjYsMzQuNDEsNDguMjYsMzQuNDFTMzQyLjY2LDE3Ljg4LDM1Ni42NSwxOGMuNTEsMCwxOS4xMyw1LjkzLDMzLjkxLDI5LjJzNDQuNjEsODYuNjUsNTAuNzQsMTAwYzYuNDQsMTQsMTguNzQsNTMuNDYsMjAuMjksNDkuNTEsMCwwLDEuMjQtNjYsMy40Ny03Ni4yNCwzLjI1LTE1LDE1LjE2LTI1LjE5LDMxLjkzLTIzLjI3UzUyNC45LDExOS44Niw1MjYuNDQsMTI4LjlabS0xMDQsOTQuM2MxLTUuNTctMy41OS02LjMxLTE3LjMzLTYuNDNzLTE4LjI5LTEuODUtMTksNS4xOSw2LjM4LDYuNTUsMjAsNi45M1M0MjEuNSwyMjguNzcsNDIyLjQ5LDIyMy4yWm0tMjIuMjgtMjEuNzhjMTMuNDktNC4wOCwxNy4wOC03LjMsMTYuMDktMTEuMTRzLTYuNTYtNC45NS0yMC4zLS43NC0xNy4wNyw2LjU5LTE1LjM3LDEyLjA1UzM4Ni43MSwyMDUuNTEsNDAwLjIxLDIwMS40MlptLTUuNDUtNDYuMjlBMTUuODQsMTUuODQsMCwxLDAsMzc4LjkyLDE3MSwxNS44NCwxNS44NCwwLDAsMCwzOTQuNzYsMTU1LjEzWk0zNDYsMjIxYy43NC0zLjQ2LjI1LTcuNzktNC04LjY2cy01LjMyLDEuMjQtMTMuMTIsMS43My01LjU3LTYuOTQtMTYuODMtNi42OGMtMTAuNjQuMjUtMTEuODgsNy4xOC0xNS44NCw3Ljkycy0xMS44OC0xLTExLjg4LTEtNS0uNjItNC45NSw1YzAsMi42NCwzLjU4LDEyLjEzLDE1LjU5LDExLjg4czEyLjUtNS4wNywxNy4zMy01LjIsMi44NSw0LjU4LDE5LjA2LDQuMjFDMzQyLjQyLDIyOS44OCwzNDUuMjYsMjI0LjQ0LDM0NiwyMjFabS04NS44OS02Ny4zMkExNS4zNSwxNS4zNSwwLDEsMCwyNDQuNzcsMTY5LDE1LjM0LDE1LjM0LDAsMCwwLDI2MC4xMSwxNTMuNjVaTTIzNi41LDIwM2MyLjM4LTMuNTUtMS44LTcuODMtMTMtMTMuMjUtMTEtNS4zMy0xNi03LjgtMTguNTYtMi4yMy0yLjMsNC45MiwxLjE1LDksMTIuMzcsMTQuMTFTMjM0LjY5LDIwNS43NSwyMzYuNSwyMDNabS01LjM1LDIyLjY0YzEuNDktNi4xOS00LjA4LTcuOC0xMy42MS05LjQxcy0xMi41LS42Mi0xNC4xMSw0Ljk1LDQuNyw3LjE4LDEzLjEyLDguNjZTMjI5LjY3LDIzMS44NiwyMzEuMTUsMjI1LjY4WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTQ1IC0xOC4wMSkiLz48cG9seWdvbiBjbGFzcz0iY2xzLTEiIHBvaW50cz0iMzEzLjg3IDMyNy45NyAzMTMuODcgNDcxLjUzIDIxNy44NCA0NzEuNTMgMjE1LjM2IDMyNy45NyAzMTMuODcgMzI3Ljk3Ii8+PGNpcmNsZSBjbGFzcz0iY2xzLTEiIGN4PSIyNjYuMjMiIGN5PSI0OTcuMzkiIHI9IjExLjUxIi8+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNODkuODksNjEzaDl2OUg0NVY1NjguMTJINjNWNjEzSDg5Ljg5WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTQ1IC0xOC4wMSkiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNDMuNzYsNjIySDExNi44M3YtOWgtOXYtNDQuOWgxOFY2MTNoMTcuOTV2LTQ0LjloMThWNjEzaC05djlaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDUgLTE4LjAxKSIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIwNi42MSw2MjJIMTc5LjY4di05aC05VjU3Ny4xaDl2LTloMzUuOTF2OWg5djloLTE4di05aC0xOFY2MTNoMTh2LTloMTh2OWgtOXY5WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTQ1IC0xOC4wMSkiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yNzguNDQsNjIyaC05di05aC05di05aC05djE4aC0xOFY1NjguMTJoMTh2MThoOXYtOWg5di05aDE4djloLTl2OWgtOXYxOGg5djloOXY5WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTQ1IC0xOC4wMSkiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0zMjMuMzMsNjIyaC05VjYwNGgtOXYtOWgtOVY1NjguMTJoMTh2MjYuOTRoMTcuOTVWNTY4LjEyaDE4djI2Ljk0aC05djloLTl2MThaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDUgLTE4LjAxKSIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTQ2MC4zMiw2MjJoLTl2LTloLTl2LTloLTl2MThINDE1LjQzVjU2OC4xMmgxNy45NXYxOGg5di05aDl2LTloMTh2OWgtOXY5aC05djE4aDl2OWg5djlaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDUgLTE4LjAxKSIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTUyMy4xNyw2MjJoLTlWNjA0aC0xOHYxOGgtMThWNTc3LjFoOXYtOWgzNS45MXY5aDlWNjIyWm0tMTgtMjYuOTNoOXYtMThoLTE4djE4WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTQ1IC0xOC4wMSkiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik01NjguMDYsNjIyaC05VjU3Ny4xaC0xOHYtOUg1OTV2OUg1NzdWNjIyWiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTQ1IC0xOC4wMSkiLz48cmVjdCBjbGFzcz0iY2xzLTEiIHg9IjMyNi45IiB5PSI1NjUuNDUiIHdpZHRoPSIyMy4yIiBoZWlnaHQ9IjIzLjIiLz48L3N2Zz4=';

    protected _provider: string;
    protected _lkServer: string;
    protected _timeout: number;
    protected _connecting: boolean;
    protected _idTokenProvider?: IdTokenProvider;
    protected _wallet: LuckyWalletAdapterExternal | null;
    protected _overrideWalletAppUrl: string | undefined;
    protected _publicKey: PublicKey | null;
    protected _readyState: WalletReadyState =
        typeof window === 'undefined' || typeof document === 'undefined'
            ? WalletReadyState.Unsupported
            : WalletReadyState.NotDetected;

    constructor(config: LuckyWalletAdapterConfig) {
        super();

        this._provider = config.appUrl;
        this._lkServer = config.lkServerUrl;
        this._idTokenProvider = config.idTokenProvider;
        this._overrideWalletAppUrl = config.overrideWalletAppUrl;

        this._timeout = 11500000; //15 minutes timeout as there's a registration process
        this._connecting = false;
        this._wallet = null;
        this._publicKey = null;

        if (this._readyState !== WalletReadyState.Unsupported) {
            this._readyState = WalletReadyState.Installed;
        }
    }

    get publicKey() {
        return this._publicKey;
    }

    get connecting() {
        return this._connecting;
    }

    get connected() {
        return !!this._wallet?.connected;
    }

    get readyState() {
        return this._readyState;
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;
            if (this._readyState !== WalletReadyState.Loadable && this._readyState !== WalletReadyState.Installed)
                throw new WalletNotReadyError();

            this._connecting = true;

            const provider = this._provider;

            let LuckyWalletAdapterClass: typeof lk.default;
            try {
                LuckyWalletAdapterClass = (await import('@luckykatstudios/lucky-wallet-adapter')).default;
            } catch (error: any) {
                throw new WalletLoadError(error?.message, error);
            }

            let wallet: LuckyWalletAdapterExternal;
            const idToken = (await this._idTokenProvider?.getIdToken()) || undefined;
            try {
                wallet = new LuckyWalletAdapterClass(provider, this._lkServer, idToken, this._overrideWalletAppUrl);
            } catch (error: any) {
                throw new WalletConfigError(error?.message, error);
            }

            try {
                // HACK: wallet adapter doesn't reject or emit an event if the popup or extension is closed or blocked
                const handleDisconnect: (...args: unknown[]) => unknown = (wallet as any).handleDisconnect;
                let timeout: NodeJS.Timer | undefined;
                let interval: NodeJS.Timer | undefined;
                try {
                    await new Promise<void>((resolve, reject) => {
                        const connect = () => {
                            if (timeout) clearTimeout(timeout);
                            wallet.off('connect', connect);
                            resolve();
                        };

                        (wallet as any).handleDisconnect = (...args: unknown[]): unknown => {
                            wallet.off('connect', connect);
                            reject(new WalletWindowClosedError());
                            return handleDisconnect.apply(wallet, args);
                        };

                        wallet.on('connect', connect);

                        wallet.connect().catch((reason: any) => {
                            wallet.off('connect', connect);
                            reject(reason);
                        });

                        if (typeof provider === 'string') {
                            let count = 0;

                            interval = setInterval(() => {
                                const _iFrame = (wallet as any)._iFrame;
                                if (!_iFrame) {
                                    if (count > 50) reject(new WalletWindowBlockedError());
                                }

                                count++;
                            }, 100);
                        } else {
                            // HACK: sol-wallet-adapter doesn't reject or emit an event if the extension is closed or ignored
                            timeout = setTimeout(() => reject(new WalletTimeoutError()), this._timeout);
                        }
                    });
                } finally {
                    (wallet as any).handleDisconnect = handleDisconnect;
                    if (interval) clearInterval(interval);
                }
            } catch (error: any) {
                if (error instanceof WalletError) throw error;
                throw new WalletConnectionError(error?.message, error);
            }

            if (!wallet.publicKey) throw new WalletAccountError();

            let publicKey: PublicKey;
            try {
                publicKey = new PublicKey(wallet.publicKey.toBytes());
            } catch (error: any) {
                throw new WalletPublicKeyError(error?.message, error);
            }

            wallet.on('disconnect', this._disconnected);

            this._wallet = wallet;
            this._publicKey = publicKey;

            this.emit('connect', publicKey);
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        const wallet = this._wallet;
        if (wallet) {
            wallet.off('disconnect', this._disconnected);

            this._wallet = null;
            this._publicKey = null;

            // HACK: sol-wallet-adapter doesn't reliably fulfill its promise or emit an event on disconnect
            const handleDisconnect: (...args: unknown[]) => unknown = (wallet as any).handleDisconnect;
            try {
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => resolve(), 250);

                    (wallet as any).handleDisconnect = (...args: unknown[]): unknown => {
                        clearTimeout(timeout);
                        resolve();
                        // HACK: sol-wallet-adapter rejects with an uncaught promise error
                        (wallet as any)._responsePromises = new Map();
                        return handleDisconnect.apply(wallet, args);
                    };

                    wallet.disconnect().then(
                        () => {
                            clearTimeout(timeout);
                            resolve();
                        },
                        (error: any) => {
                            clearTimeout(timeout);
                            // HACK: sol-wallet-adapter rejects with an error on disconnect
                            if (error?.message === 'Wallet disconnected') {
                                resolve();
                            } else {
                                reject(error);
                            }
                        }
                    );
                });
            } catch (error: any) {
                this.emit('error', new WalletDisconnectionError(error?.message, error));
            } finally {
                (wallet as any).handleDisconnect = handleDisconnect;
            }
        }

        this.emit('disconnect');
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signTransaction(transaction)) || transaction;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signAllTransactions(transactions)) || transactions;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                const signature = await wallet.signMessage(bs58.encode(message));
                return Uint8Array.from(signature);
            } catch (error: any) {
                throw new WalletSignMessageError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    private _disconnected = () => {
        const wallet = this._wallet;
        if (wallet) {
            wallet.off('disconnect', this._disconnected);

            this._wallet = null;
            this._publicKey = null;

            this.emit('error', new WalletDisconnectedError());
            this.emit('disconnect');
        }
    };
}

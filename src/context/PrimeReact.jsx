import { PrimeReactProvider, PrimeReactContext } from 'primereact/api';

export default function PrimeReact({ Component, pageProps }) {
    return (
        <PrimeReactProvider>
            <Component {...pageProps} />
        </PrimeReactProvider>
    );
}
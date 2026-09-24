import type { AppProps } from 'next/app';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
config.autoAddCss = false;

import '../styles/globals.css';
import '../styles/basic.css';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';

import '../i18n';

function MyApp({ Component, pageProps }: AppProps) {
    // The UI language is detected in the browser (query string, saved choice, browser settings).
    // Pre-rendering would bake in the language of the machine that built the static export and
    // the page would then not match the client render, so the app is rendered only on the client.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>PL/0</title>
            </Head>
            {mounted && <Component {...pageProps} />}
        </>
    );
}

export default MyApp;

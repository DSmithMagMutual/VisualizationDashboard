import type { AppProps } from 'next/app';
import '../styles/globals.css';
import SurveyPopup from '../components/SurveyPopup';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <SurveyPopup />
      <Component {...pageProps} />
    </>
  );
} 
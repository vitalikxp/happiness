import '@fontsource/ruslan-display/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/400-italic.css';
import '@fontsource/alegreya/700.css';
import './styles/main.css';
import { render } from 'preact';
import { App } from './App.tsx';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');
render(<App />, root);

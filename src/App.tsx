import { Shell } from './app/Shell';
import { I18nProvider } from './i18n';
import { ScienceProvider } from './services/ScienceProvider';

function App() {
  return (
    <I18nProvider>
      <ScienceProvider>
        <Shell />
      </ScienceProvider>
    </I18nProvider>
  );
}

export default App;

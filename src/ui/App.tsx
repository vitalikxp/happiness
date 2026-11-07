import { useEffect, useMemo } from 'preact/hooks';
import { Board } from './components/Board.tsx';
import { TraitChoice, UpkeepPanel } from './components/Decisions.tsx';
import { EndScreen } from './components/EndScreen.tsx';
import { HistoryPage, LifePage } from './components/History.tsx';
import { NewGame } from './components/NewGame.tsx';
import { content } from './content.ts';
import { locale, t } from './i18n/index.ts';
import { view } from './nav.ts';
import { optionsFor } from './options.ts';
import { isHumanTurn, session } from './session.ts';

export function App() {
  const current = session.value;
  const title = t('app.title');

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = locale.value;
  }, [title]);

  const state = current?.state;
  const options = useMemo(
    () => (current && state ? optionsFor(state, content, current.human) : null),
    [state, current?.human],
  );

  if (!current || !options) {
    const page = view.value;
    if (page.kind === 'history') return <HistoryPage />;
    if (page.kind === 'life') return <LifePage id={page.id} />;
    return <NewGame />;
  }
  if (current.state.phase === 'gameOver') return <EndScreen session={current} />;

  if (current.state.phase === 'setup') {
    return (
      <main class="title-page">
        {isHumanTurn.value ? (
          <TraitChoice session={current} options={options} />
        ) : (
          <p class="hint center">{t('trait.waiting')}</p>
        )}
      </main>
    );
  }

  const deciding = current.state.phase === 'upkeep' && isHumanTurn.value;
  return (
    <>
      {deciding && (
        <div class="overlay">
          <UpkeepPanel state={current.state} session={current} options={options} />
        </div>
      )}
      <Board session={current} options={options} inert={deciding} />
    </>
  );
}

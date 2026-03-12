import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Fite0200Page } from '@/components/screens/Fite0200Page';

export function ScreenHostPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();

  const screen = useMemo(() => {
    if (code === 'FITE0200') {
      return <Fite0200Page />;
    }

    return (
      <main className="screen-layout">
        <header>
          <h1>{code ?? 'Tela não encontrada'}</h1>
          <p>Tela ainda não implementada.</p>
        </header>
      </main>
    );
  }, [code]);

  return screen;
}

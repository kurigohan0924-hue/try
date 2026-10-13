import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../features/home/HomePage';
import { QuestionListPage } from '../features/list/QuestionListPage';
import { PlayPage } from '../features/play/PlayPage';
import { QuickAddPage } from '../features/quick/QuickAddPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { useSettings } from './usePool';

/** HashRouter：GitHub Pages・オフラインでもどの画面を再読み込みしても 404 にならない */
export function App() {
  const settings = useSettings();
  const theme = settings?.theme ?? 'system';
  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/quick" element={<QuickAddPage />} />
        <Route path="/questions" element={<QuestionListPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

import { storage } from './storage';

// Tema escolhido em Ajustes → Aparência: 'system' (segue o celular), 'light' ou 'dark'.
export const themeSetting = () => {
  const t = storage.settings.get().theme;
  return t === 'light' || t === 'dark' ? t : 'system';
};

export const isDarkTheme = (theme = themeSetting()) => (theme === 'system'
  ? Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  : theme === 'dark');

// Aplica no <html> (o CSS lê data-theme) e ajusta a barra de status do Android.
export const applyTheme = async (theme = themeSetting()) => {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;

  const dark = isDarkTheme(theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0f1412' : '#eef1ef');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: dark ? '#0f1412' : '#eef1ef' });
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch {
    // StatusBar só existe no app nativo
  }
};

// Com "Sistema", acompanha quando o celular troca de tema.
export const watchSystemTheme = () => {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!media) return () => {};
  const onChange = () => { if (themeSetting() === 'system') applyTheme('system'); };
  media.addEventListener?.('change', onChange);
  return () => media.removeEventListener?.('change', onChange);
};

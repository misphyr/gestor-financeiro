import { Capacitor } from '@capacitor/core';

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

// Salva um arquivo: no Android grava no cache e abre o compartilhamento nativo;
// no navegador dispara o download. Retorna true se deu certo.
export const exportFile = async (content, mimeType, filename, title = 'Relatório financeiro') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });

  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      await Filesystem.writeFile({ path: filename, data: await blobToBase64(blob), directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title, url: uri, dialogTitle: 'Compartilhar' });
      return true;
    } catch {
      return false;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
};

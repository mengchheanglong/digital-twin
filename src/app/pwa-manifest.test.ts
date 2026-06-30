import * as fs from 'fs';
import * as path from 'path';

type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

describe('PWA manifest installability metadata', () => {
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    id?: string;
    lang?: string;
    dir?: string;
    categories?: string[];
    icons?: ManifestIcon[];
  };

  it('declares PNG app icons required by PWA installers', () => {
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }),
      ]),
    );

    for (const icon of manifest.icons ?? []) {
      if (icon.type === 'image/png') {
        expect(fs.existsSync(path.join(process.cwd(), 'public', icon.src))).toBe(true);
      }
    }
  });

  it('includes stable manifest identity and language metadata', () => {
    expect(manifest.id).toBe('/');
    expect(manifest.lang).toBe('en');
    expect(manifest.dir).toBe('ltr');
    expect(manifest.categories).toEqual(expect.arrayContaining(['productivity', 'lifestyle']));
  });
});

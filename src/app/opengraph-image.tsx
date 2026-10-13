import { ImageResponse } from 'next/og';
import { OgMark } from './og-mark';

export const alt = 'Orion: from good first issue to merged pull request';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#fafafa',
          color: '#171717',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <OgMark size={44} color="#171717" line="rgba(23,23,23,0.42)" />
          <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>Orion</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <span style={{ fontSize: 22, letterSpacing: 3, color: '#666666', textTransform: 'uppercase' }}>
            Open source, organized
          </span>
          <span style={{ fontSize: 76, fontWeight: 500, letterSpacing: -4, lineHeight: 1.02, maxWidth: 900 }}>
            From good first issue to merged pull request.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 24, color: '#4d4d4d', borderTop: '1px solid #ebebeb', paddingTop: 28 }}>
          <span>Live GitHub issues</span>
          <span>Issue tracker</span>
          <span>Program deadlines</span>
          <span>Bounties</span>
        </div>
      </div>
    ),
    size
  );
}

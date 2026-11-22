import mark from '../assets/nexora-mark.svg';

type Props = { message: string };

/* Shown only if the legacy modules fail to start, so the page is never silently blank. */
export function BootError({ message }: Props) {
  return (
    <div role="alert" style={{ maxWidth: 520, margin: '15vh auto', padding: 24, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#2B3553' }}>
      <img src={mark} width={48} height={48} alt="" />
      <h1 style={{ fontFamily: 'Manrope, system-ui, sans-serif', fontSize: '1.4rem', margin: '16px 0 8px' }}>NEXORA could not start</h1>
      <p style={{ color: '#6B7590', margin: 0 }}>Reload the page. If it keeps happening, open the browser console and share this message:</p>
      <code style={{ display: 'block', marginTop: 12, padding: 12, background: '#F3F0FF', borderRadius: 10, fontSize: '.85rem', overflowWrap: 'anywhere' }}>{message}</code>
    </div>
  );
}

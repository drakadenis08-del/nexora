import fallbackArt from '../../assets/mascot-hummingbird.svg';

type Props = { className?: string };

/* Static picture: shown while the 3D chunk loads, with reduced motion, without WebGL, or after an error. */
export function MascotFallback({ className }: Props) {
  return <img className={className ?? 'mascot-fallback'} src={fallbackArt} alt="" width={180} height={180} draggable={false} />;
}

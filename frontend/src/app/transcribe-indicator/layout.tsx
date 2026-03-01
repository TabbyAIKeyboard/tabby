export default function TranscribeIndicatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      background: 'transparent',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      width: '100vw',
      height: '100vh',
    }}>
      {children}
    </div>
  );
}

export default function GhostOverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ghost-layout" style={{ 
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

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="story-page min-h-screen overflow-x-hidden" style={{ background: 'var(--story-bg)', color: 'var(--story-text)' }}>
      {children}
    </div>
  );
}

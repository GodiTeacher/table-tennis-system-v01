import Link from 'next/link';

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      {children}
      <Link
        href={`/students/${id}/recommend-training`}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 92,
          zIndex: 90,
          textDecoration: 'none',
          background: '#273444',
          color: '#fff',
          borderRadius: 999,
          padding: '12px 16px',
          fontWeight: 800,
          boxShadow: '0 10px 28px rgba(24,33,47,.2)',
        }}
      >
        ＋ 依能力安排今日訓練
      </Link>
    </>
  );
}

import DashboardShell from './DashboardShell';
import MotionConfigProvider from '@/components/shared/MotionConfigProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionConfigProvider>
      <DashboardShell>{children}</DashboardShell>
    </MotionConfigProvider>
  );
}

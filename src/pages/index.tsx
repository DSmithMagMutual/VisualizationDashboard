import MinimalistDashboard from '../components/MinimalistDashboard';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="absolute top-4 right-4">
        <Link href="/configure-targets" className="text-indigo-600 hover:underline text-sm font-medium">Configure Targets</Link>
      </div>
      <MinimalistDashboard />
    </>
  );
} 
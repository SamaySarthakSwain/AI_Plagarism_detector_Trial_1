import { Navbar } from '@/components/Navbar';
import { AutomationHub } from '@/components/AutomationHub';

export default function AutomationPage() {
  return (
    <div className="min-h-screen hero-bg">
      <Navbar />
      <div className="pt-20">
        <AutomationHub />
      </div>
    </div>
  );
}

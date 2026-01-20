'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PortalSignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/portal/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/portal/login');
        router.refresh();
      } else {
        toast.error('Failed to sign out');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  return (
    <Button 
      variant="ghost" 
      onClick={handleSignOut}
      className="text-gray-100 hover:bg-primary-dark hover:text-white"
    >
      Sign Out
    </Button>
  );
}

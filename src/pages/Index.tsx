import { BillingModule } from '@/components/billing/BillingModule';
import { MobilePOSLayout } from '@/components/mobile/MobilePOSLayout';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  
  // Mobile: Use dedicated mobile POS layout with bottom tabs
  // Desktop: Use original billing module layout
  if (isMobile) {
    return <MobilePOSLayout />;
  }
  
  return <BillingModule />;
};

export default Index;

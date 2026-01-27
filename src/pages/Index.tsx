import { BillingModule } from '@/components/billing/BillingModule';
import { MobileBillingModule } from '@/components/billing/mobile';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  
  // Use mobile layout on tablets and phones
  if (isMobile) {
    return <MobileBillingModule />;
  }
  
  return <BillingModule />;
};

export default Index;

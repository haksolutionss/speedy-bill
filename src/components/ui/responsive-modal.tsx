
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
    isOpen,
    onClose,
    title,
    children
}) => {
    const isMobile = useIsMobile();

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    };

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={handleOpenChange}>
                <DrawerContent className="bg-background border-border max-h-[90vh]">
                    {title && (
                        <DrawerHeader>
                            <DrawerTitle className="">{title}</DrawerTitle>
                        </DrawerHeader>
                    )}
                    <div className="p-6 overflow-y-auto flex-1">
                        {children}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto">
                {title && (
                    <DialogHeader>
                        <DialogTitle className="">{title}</DialogTitle>
                    </DialogHeader>
                )}
                <div className="space-y-4">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ResponsiveModal;
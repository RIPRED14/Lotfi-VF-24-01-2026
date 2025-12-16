import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import useGelosesAutoFill from '@/hooks/useGelosesAutoFill';
import { Info } from 'lucide-react';

interface LotsInformationProps {
  selectedBacteria: string[];
  className?: string;
}

const LotsInformation: React.FC<LotsInformationProps> = ({
  selectedBacteria,
  className = '',
}) => {
  // Utilisation du hook pour obtenir les géloses et normes ISO
  const { geloses, hasGeloses, isoNorms } = useGelosesAutoFill(selectedBacteria);

  return null;
};

export default LotsInformation; 
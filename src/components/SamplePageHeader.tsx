import React from 'react';
import Header from '@/components/Header';

interface SamplePageHeaderProps {
  title: string;
}

const SamplePageHeader: React.FC<SamplePageHeaderProps> = ({ title }) => {
  return <Header 
    title={title} 
    hideMenuItems={['Lectures en Attente', 'Historique', 'Formulaires', 'Administration']} 
  />;
};

export default SamplePageHeader;

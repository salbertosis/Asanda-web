import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageHero from '../components/PageHero';
import RecordEstadal from '../components/RecordEstadal';

const RecordEstadalPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero con título Récord Estadal */}
      <PageHero 
        title="Récord Estadal"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      {/* Contenido de Récord Estadal */}
      <RecordEstadal />

      <Footer />
    </div>
  );
};

export default RecordEstadalPage;


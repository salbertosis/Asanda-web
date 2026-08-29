import React, { useEffect, useState } from 'react';
import { getFeaturedAthletes } from '../services/athletes';
import AthleteDirectoryView from './AthleteDirectoryView';

const FeaturedAthleteDirectory = () => {
  const [athletes, setAthletes] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getFeaturedAthletes(controller.signal)
      .then((featuredAthletes) => {
        if (!active) return;
        setAthletes(featuredAthletes);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return <AthleteDirectoryView athletes={athletes} status={status} type="featured" />;
};

export default FeaturedAthleteDirectory;

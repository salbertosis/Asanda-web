import React, { useEffect, useState } from 'react';
import { getPublishedAthletes } from '../services/athletes';
import AthleteDirectoryView from './AthleteDirectoryView';

const AthleteDirectory = ({ membershipType }) => {
  const [athletes, setAthletes] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getPublishedAthletes(membershipType, controller.signal)
      .then((publishedAthletes) => {
        if (!active) return;
        setAthletes(publishedAthletes);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [membershipType]);

  return <AthleteDirectoryView athletes={athletes} status={status} type={membershipType || 'published'} />;
};

export default AthleteDirectory;
